"use client";

import { useUser } from "@clerk/nextjs";
import type { UserRole } from "@/lib/auth";

export function useUserRole(): {
  role: UserRole | null;
  isLoaded: boolean;
} {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return { role: null, isLoaded };
  }

  const role = (user.publicMetadata?.role as UserRole) ?? null;
  return { role, isLoaded };
}
