import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const rawRole = typeof body.role === "string" ? body.role.toUpperCase().trim() : "";

  if (rawRole !== "CLIENT" && rawRole !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const role = rawRole as "CLIENT" | "ACCOUNTANT";

  const clerk = await clerkClient();

  // Set role on Clerk publicMetadata (source of truth)
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      role,
      onboarded: true,
    },
  });

  // Get the Clerk user for email/name info
  const clerkUser = await clerk.users.getUser(userId);

  // Mirror in Prisma
  await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      role,
      onboarded: true,
    },
    create: {
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
      role,
      onboarded: true,
    },
  });

  return NextResponse.json({ success: true, role });
}
