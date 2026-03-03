import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLANS, type PlanTier } from "@/lib/plans";

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
  const { plan } = body as { plan: PlanTier };

  if (!plan || !(plan in PLANS) || plan === "FREE") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planConfig = PLANS[plan];
  if (!planConfig.stripePriceId) {
    return NextResponse.json({ error: "Price not configured" }, { status: 400 });
  }

  // Find or create Stripe customer
  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
  });

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id, clerkId },
    });
    customerId = customer.id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/client?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { userId: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
