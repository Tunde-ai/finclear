import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const transactionId = request.nextUrl.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId required" }, { status: 400 });
  }

  const notes = await prisma.transactionNote.findMany({
    where: { transactionId },
    include: {
      user: { select: { firstName: true, lastName: true, role: true, imageUrl: true } },
      replies: {
        include: {
          user: { select: { firstName: true, lastName: true, role: true, imageUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Filter to top-level notes only (replies are nested)
  const topLevel = notes.filter((n) => !n.parentId);

  return NextResponse.json({ notes: topLevel });
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
  const { transactionId, content, parentId } = body;

  if (!transactionId || !content?.trim()) {
    return NextResponse.json({ error: "transactionId and content required" }, { status: 400 });
  }

  const note = await prisma.transactionNote.create({
    data: {
      transactionId,
      userId: user.id,
      content: content.trim(),
      parentId: parentId || null,
    },
    include: {
      user: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
