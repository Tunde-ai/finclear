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

  const ads = await prisma.adSpend.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json({ ads });
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
  const { date, platform, campaign, spend, impressions, clicks, conversions, revenue } = body;

  if (!date || !platform || spend === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ad = await prisma.adSpend.create({
    data: {
      userId: user.id,
      date: new Date(date),
      platform,
      campaign: campaign || null,
      spend,
      impressions: impressions || null,
      clicks: clicks || null,
      conversions: conversions || null,
      revenue: revenue || null,
    },
  });

  return NextResponse.json({ ad }, { status: 201 });
}
