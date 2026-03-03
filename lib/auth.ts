import { auth, currentUser } from "@clerk/nextjs/server";

export type UserRole = "CLIENT" | "ACCOUNTANT";

export async function getUserRole(): Promise<UserRole | null> {
  const { sessionClaims } = await auth();
  return (sessionClaims?.metadata?.role as UserRole) ?? null;
}

export async function getUserWithRole() {
  const user = await currentUser();
  if (!user) return null;

  const role = (user.publicMetadata?.role as UserRole) ?? null;
  const onboarded = (user.publicMetadata?.onboarded as boolean) ?? false;

  return { user, role, onboarded };
}
