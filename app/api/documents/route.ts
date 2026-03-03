import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "ACCOUNTANT") {
    // Accountants see documents from all their clients
    const orgMemberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: { include: { members: true } } },
    });

    // Collect all client user IDs from organizations where this accountant is a member
    const clientUserIds = new Set<string>();
    for (const membership of orgMemberships) {
      // The org owner is the client
      clientUserIds.add(membership.organization.ownerId);
      // Also include other members who are clients
      for (const member of membership.organization.members) {
        if (member.userId !== user.id) {
          clientUserIds.add(member.userId);
        }
      }
    }

    const documents = await prisma.document.findMany({
      where: { userId: { in: Array.from(clientUserIds) } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  }

  // Clients see only their own documents
  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}
