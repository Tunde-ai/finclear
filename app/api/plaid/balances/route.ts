import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: user.id, plaidAccessToken: { not: null } },
  });

  if (accounts.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  // Collect unique encrypted tokens
  const uniqueTokens = Array.from(new Set(accounts.map((a) => a.plaidAccessToken!)));

  // Fetch balances for each unique access token
  for (const encryptedToken of uniqueTokens) {
    const accessToken = decrypt(encryptedToken);
    const balanceResponse = await plaidClient.accountsBalanceGet({
      access_token: accessToken,
    });

    for (const plaidAcct of balanceResponse.data.accounts) {
      await prisma.account.updateMany({
        where: { plaidAccountId: plaidAcct.account_id, userId: user.id },
        data: {
          currentBalance: plaidAcct.balances.current ?? 0,
          availableBalance: plaidAcct.balances.available ?? null,
        },
      });
    }
  }

  // Fetch updated accounts
  const updatedAccounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ accounts: updatedAccounts });
}
