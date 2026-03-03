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

  const sales = await prisma.marketSale.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 500,
  });

  return NextResponse.json({ sales });
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
  const { date, location, items, vendorFee, saleType } = body;

  if (!date || !location || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sales = await prisma.$transaction(
    items.map((item: { product: string; quantity: number; unitPrice: number }) =>
      prisma.marketSale.create({
        data: {
          userId: user.id,
          date: new Date(date),
          location,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalSale: item.quantity * item.unitPrice,
          saleType: saleType || "RETAIL",
          vendorFee: vendorFee ? vendorFee / items.length : null,
          notes: body.notes || null,
        },
      })
    )
  );

  return NextResponse.json({ sales }, { status: 201 });
}
