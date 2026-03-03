"use client";

import { useRouter } from "next/navigation";
import { PlaidLinkButton } from "@/components/plaid/plaid-link-button";

export function ClientDashboardActions() {
  const router = useRouter();

  return (
    <PlaidLinkButton onSuccess={() => router.refresh()}>
      Connect Bank
    </PlaidLinkButton>
  );
}
