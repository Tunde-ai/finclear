"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PlaidLinkButton } from "@/components/plaid/plaid-link-button";

export function AccountsActions() {
  const router = useRouter();

  return (
    <PlaidLinkButton onSuccess={() => router.refresh()} className="gap-2">
      <Plus className="h-4 w-4" /> Link Account
    </PlaidLinkButton>
  );
}
