import { NextRequest, NextResponse } from "next/server";
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

  // Find organizations the user belongs to (either as owner or member)
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const ownedOrgs = await prisma.organization.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });

  const orgIds = [
    ...memberships.map((m) => m.organizationId),
    ...ownedOrgs.map((o) => o.id),
  ];

  if (orgIds.length === 0) {
    return NextResponse.json({ messages: [], organizationId: null });
  }

  const messages = await prisma.message.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      sender: {
        select: { firstName: true, lastName: true, role: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ messages, organizationId: orgIds[0] });
}

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const { content, organizationId } = body;

  if (!content?.trim() || !organizationId) {
    return NextResponse.json({ error: "content and organizationId required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      organizationId,
      senderId: user.id,
      content: content.trim(),
    },
    include: {
      sender: {
        select: { firstName: true, lastName: true, role: true, imageUrl: true },
      },
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
