"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, CheckCircle } from "lucide-react";

export default function InviteAccountantPage() {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "sending" | "sent">("form");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("sending");

    try {
      // Step 1: Create the organization (if we haven't already)
      let currentOrgId = orgId;
      if (!currentOrgId) {
        const orgRes = await fetch("/api/organizations/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName }),
        });

        if (!orgRes.ok) {
          const data = await orgRes.json();
          throw new Error(data.error || "Failed to create organization");
        }

        const orgData = await orgRes.json();
        currentOrgId = orgData.organizationId;
        setOrgId(currentOrgId);
      }

      // Step 2: Send the invitation
      const inviteRes = await fetch("/api/organizations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          organizationId: currentOrgId,
        }),
      });

      if (!inviteRes.ok) {
        const data = await inviteRes.json();
        throw new Error(data.error || "Failed to send invitation");
      }

      setStep("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  if (step === "sent") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Invite Accountant</h2>
        <Card className="max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Invitation Sent
            </h3>
            <p className="text-center text-sm text-gray-500">
              We&apos;ve sent an invitation to <strong>{email}</strong>. They
              will be able to manage your finances once they accept.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setEmail("");
                setStep("form");
              }}
            >
              Invite Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Invite Accountant</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Invite Your Accountant
          </CardTitle>
          <CardDescription>
            Create an organization and invite your accountant to manage your
            finances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!orgId && (
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Organization Name
                </label>
                <input
                  id="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder='e.g. "My Finances"'
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Accountant&apos;s Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accountant@example.com"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={step === "sending"}
            >
              {step === "sending" ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
