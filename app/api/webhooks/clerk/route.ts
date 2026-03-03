import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  // Handle organizationMembership.created
  if (evt.type === "organizationMembership.created") {
    const { organization, public_user_data } = evt.data;
    const memberClerkUserId = public_user_data.user_id;

    if (!memberClerkUserId) {
      return new Response("No user ID in membership event", { status: 400 });
    }

    const clerk = await clerkClient();

    // Auto-assign ACCOUNTANT role to invited members
    await clerk.users.updateUserMetadata(memberClerkUserId, {
      publicMetadata: {
        role: "ACCOUNTANT",
        onboarded: true,
      },
    });

    // Upsert user in Prisma
    const clerkUser = await clerk.users.getUser(memberClerkUserId);

    const dbUser = await prisma.user.upsert({
      where: { clerkId: memberClerkUserId },
      update: {
        role: "ACCOUNTANT",
        onboarded: true,
      },
      create: {
        clerkId: memberClerkUserId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        role: "ACCOUNTANT",
        onboarded: true,
      },
    });

    // Mirror org membership in Prisma
    const dbOrg = await prisma.organization.findUnique({
      where: { clerkOrgId: organization.id },
    });

    if (dbOrg) {
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: dbOrg.id,
            userId: dbUser.id,
          },
        },
        update: {
          clerkRole: "member",
        },
        create: {
          organizationId: dbOrg.id,
          userId: dbUser.id,
          clerkRole: "member",
        },
      });
    }
  }

  return new Response("OK", { status: 200 });
}
