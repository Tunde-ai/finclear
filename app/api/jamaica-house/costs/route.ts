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

  const costs = await prisma.costEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 500,
  });

  return NextResponse.json({ costs });
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
  const { date, supplier, item, quantity, unitCost, category } = body;

  if (!date || !supplier || !item || !quantity || !unitCost) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cost = await prisma.costEntry.create({
    data: {
      userId: user.id,
      date: new Date(date),
      supplier,
      item,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      category: category || null,
    },
  });

  return NextResponse.json({ cost }, { status: 201 });
}
