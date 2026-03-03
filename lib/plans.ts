export type PlanTier = "FREE" | "STARTER" | "PROFESSIONAL" | "BUSINESS";

export interface PlanConfig {
  name: string;
  price: number;
  stripePriceId: string | null;
  features: string[];
  limits: {
    bankAccounts: number;
    users: number;
    documents: number;
    reportFrequency: string;
    googleDrive: boolean;
    pdfExports: boolean;
    jamaicaHouse: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
  };
  popular?: boolean;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  FREE: {
    name: "Free",
    price: 0,
    stripePriceId: null,
    features: [
      "1 bank account",
      "Basic dashboard",
      "Manual transaction entry",
    ],
    limits: {
      bankAccounts: 1,
      users: 1,
      documents: 10,
      reportFrequency: "none",
      googleDrive: false,
      pdfExports: false,
      jamaicaHouse: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  STARTER: {
    name: "Starter",
    price: 19,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || "",
    features: [
      "1 bank account",
      "1 user",
      "100 documents",
      "Monthly AI reports",
      "Email support",
    ],
    limits: {
      bankAccounts: 1,
      users: 1,
      documents: 100,
      reportFrequency: "monthly",
      googleDrive: false,
      pdfExports: false,
      jamaicaHouse: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 49,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "",
    features: [
      "3 bank accounts",
      "Client + accountant access",
      "Unlimited documents",
      "Weekly AI reports",
      "Google Drive sync",
      "PDF exports",
      "Transaction collaboration",
    ],
    limits: {
      bankAccounts: 3,
      users: 2,
      documents: Infinity,
      reportFrequency: "weekly",
      googleDrive: true,
      pdfExports: true,
      jamaicaHouse: false,
      whiteLabel: false,
      prioritySupport: false,
    },
    popular: true,
  },
  BUSINESS: {
    name: "Business",
    price: 99,
    stripePriceId: process.env.STRIPE_BUSINESS_PRICE_ID || "",
    features: [
      "Unlimited bank accounts",
      "Team access",
      "Daily AI reports",
      "Jamaica House module",
      "White-label option",
      "Priority support",
      "All Professional features",
    ],
    limits: {
      bankAccounts: Infinity,
      users: Infinity,
      documents: Infinity,
      reportFrequency: "daily",
      googleDrive: true,
      pdfExports: true,
      jamaicaHouse: true,
      whiteLabel: true,
      prioritySupport: true,
    },
  },
};

export function getUserPlan(plan: string | undefined): PlanConfig {
  if (plan && plan in PLANS) return PLANS[plan as PlanTier];
  return PLANS.FREE;
}

export function canAccessFeature(
  plan: string | undefined,
  feature: keyof PlanConfig["limits"]
): boolean {
  const config = getUserPlan(plan);
  const value = config.limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return value !== "none";
}
