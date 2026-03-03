import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, organizationId } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find the org to get its Clerk ID
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { owner: true },
  });

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  // Verify the requesting user owns this org
  if (org.owner.clerkId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clerk = await clerkClient();

  // Send Clerk organization invitation
  await clerk.organizations.createOrganizationInvitation({
    organizationId: org.clerkOrgId,
    emailAddress: email,
    inviterUserId: userId,
    role: "org:member",
  });

  return NextResponse.json({ success: true });
}
