import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
  const { transactionId, status } = body;

  if (!transactionId || !["NEEDS_REVIEW", "APPROVED"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const flag = await prisma.transactionFlag.upsert({
    where: { transactionId },
    update: { status, flaggedBy: user.id },
    create: {
      transactionId,
      status,
      flaggedBy: user.id,
    },
  });

  return NextResponse.json({ flag });
}

export async function DELETE(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transactionId = request.nextUrl.searchParams.get("transactionId");
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId required" }, { status: 400 });
  }

  await prisma.transactionFlag.deleteMany({ where: { transactionId } });

  return NextResponse.json({ success: true });
}
