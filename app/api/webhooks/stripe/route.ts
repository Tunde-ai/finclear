import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@prisma/client";

const PRICE_TO_PLAN: Record<string, SubscriptionPlan> = {
  [process.env.STRIPE_STARTER_PRICE_ID || ""]: "STARTER",
  [process.env.STRIPE_PROFESSIONAL_PRICE_ID || ""]: "PROFESSIONAL",
  [process.env.STRIPE_BUSINESS_PRICE_ID || ""]: "BUSINESS",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as SubscriptionPlan | undefined;

      if (userId && session.subscription && session.customer) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer.id;

        await prisma.subscription.upsert({
          where: { stripeCustomerId: customerId },
          update: {
            stripeSubscriptionId: subscriptionId,
            plan: plan || "STARTER",
            status: "ACTIVE",
          },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: session.metadata?.priceId || null,
            plan: plan || "STARTER",
            status: "ACTIVE",
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

      const updateData: Record<string, unknown> = {
        status: subscription.status === "active" ? "ACTIVE"
          : subscription.status === "past_due" ? "PAST_DUE"
          : "CANCELED",
      };

      if (plan) updateData.plan = plan;
      if (priceId) updateData.stripePriceId = priceId;

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: updateData,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: "CANCELED",
          plan: "FREE",
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
