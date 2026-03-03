"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    id: "STARTER",
    name: "Starter",
    price: 19,
    description: "For individuals getting started",
    features: [
      "1 bank account",
      "1 user",
      "100 documents",
      "Monthly AI reports",
      "Email support",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: 49,
    popular: true,
    description: "For small businesses and freelancers",
    features: [
      "3 bank accounts",
      "Client + accountant access",
      "Unlimited documents",
      "Weekly AI reports",
      "Google Drive sync",
      "PDF exports",
      "Transaction collaboration",
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: 99,
    description: "For growing teams and enterprises",
    features: [
      "Unlimited bank accounts",
      "Team access",
      "Daily AI reports",
      "Jamaica House module",
      "White-label option",
      "Priority support",
      "All Professional features",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }

      // If not authenticated, redirect to sign-in
      if (res.status === 401) {
        router.push("/sign-in");
        return;
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold">FC</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Simple, transparent pricing
          </h1>
          <p className="mt-2 text-gray-500">
            Choose the plan that fits your business. Upgrade or cancel anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.popular
                  ? "border-emerald-500 shadow-lg scale-105"
                  : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-gray-500">{plan.description}</p>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            All plans include a 14-day free trial. Cancel anytime. Prices in
            USD.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Need help?{" "}
            <a href="mailto:support@finclear.app" className="text-emerald-600 hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
