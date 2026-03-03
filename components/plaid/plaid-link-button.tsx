"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function PlaidLinkButton({
  onSuccess,
  children = "Connect Bank",
  className,
  variant = "default",
  size = "default",
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLinkToken() {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      setLinkToken(data.link_token);
    }
    fetchLinkToken();
  }, []);

  const handlePlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      try {
        await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        onSuccess?.();
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
  });

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      className={className}
      variant={variant}
      size={size}
    >
      {loading ? "Connecting..." : children}
    </Button>
  );
}
