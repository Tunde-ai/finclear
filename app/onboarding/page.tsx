"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Calculator } from "lucide-react";

const roles = [
  {
    id: "CLIENT" as const,
    title: "Client",
    description:
      "Track your finances, manage accounts, set budgets, and get AI-powered insights.",
    icon: Wallet,
    features: [
      "Connect bank accounts",
      "Track transactions",
      "Set budgets & goals",
      "AI financial insights",
    ],
  },
  {
    id: "ACCOUNTANT" as const,
    title: "Accountant",
    description:
      "Manage multiple clients, review transactions, and provide professional oversight.",
    icon: Calculator,
    features: [
      "Manage client portfolios",
      "Review transactions",
      "Financial reporting",
      "Organization management",
    ],
  },
];

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<
    "CLIENT" | "ACCOUNTANT" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const { user } = useUser();

  async function handleContinue() {
    if (!selectedRole) return;

    setIsLoading(true);
    setError(null);
    setStatus("Calling API...");

    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      setStatus(`API responded: ${res.status}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to set role (${res.status})`);
      }

      setStatus("Role set. Reloading session...");

      // Reload the user to get updated metadata in the session
      try {
        await user?.reload();
      } catch {
        // If reload fails, still redirect — Clerk will pick up the metadata
      }

      setStatus("Redirecting...");

      const dest =
        selectedRole === "ACCOUNTANT"
          ? "/dashboard/accountant"
          : "/dashboard/client";

      // Use window.location as fallback — router.push can silently fail
      window.location.href = dest;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setStatus("");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">FC</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to FinClear
          </h1>
          <p className="mt-2 text-gray-500">
            How will you be using FinClear? You can change this later.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {roles.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-emerald-600 ring-2 ring-emerald-600"
                    : "hover:border-gray-300"
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        isSelected ? "bg-emerald-100" : "bg-gray-100"
                      }`}
                    >
                      <role.icon
                        className={`h-6 w-6 ${
                          isSelected ? "text-emerald-600" : "text-gray-600"
                        }`}
                      />
                    </div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-gray-500">
                    {role.description}
                  </p>
                  <ul className="space-y-2">
                    {role.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {error && (
          <div className="mx-auto max-w-xs rounded-lg bg-red-50 border border-red-200 p-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {status && !error && (
          <div className="mx-auto max-w-xs text-center text-sm text-gray-500">
            {status}
          </div>
        )}

        <div className="flex justify-center">
          <Button
            className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700"
            disabled={!selectedRole || isLoading}
            onClick={handleContinue}
          >
            {isLoading ? status || "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
