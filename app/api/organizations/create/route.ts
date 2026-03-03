import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();

  // Create org in Clerk with current user as admin
  const clerkOrg = await clerk.organizations.createOrganization({
    name,
    createdBy: userId,
  });

  // Find the Prisma user
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Mirror in Prisma
  const org = await prisma.organization.create({
    data: {
      clerkOrgId: clerkOrg.id,
      name: clerkOrg.name,
      ownerId: dbUser.id,
    },
  });

  // Add owner as member
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: dbUser.id,
      clerkRole: "admin",
    },
  });

  return NextResponse.json({ success: true, organizationId: org.id });
}
