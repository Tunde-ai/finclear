import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { mapPlaidCategory } from "@/lib/plaid-categories";
import { AccountType } from "@prisma/client";

function mapAccountType(plaidType: string): AccountType {
  switch (plaidType) {
    case "depository":
      return "CHECKING";
    case "credit":
      return "CREDIT";
    case "investment":
      return "INVESTMENT";
    case "loan":
      return "LOAN";
    default:
      return "OTHER";
  }
}

function refineAccountType(plaidType: string, subtype: string | null): AccountType {
  if (plaidType === "depository" && subtype === "savings") return "SAVINGS";
  return mapAccountType(plaidType);
}

export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { public_token } = await request.json();
  if (!public_token) {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  // 1. Exchange public token for access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token,
  });
  const accessToken = exchangeResponse.data.access_token;
  const itemId = exchangeResponse.data.item_id;
  const encryptedToken = encrypt(accessToken);

  // 2. Get accounts from Plaid
  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  // 3. Upsert each account
  const upsertedAccounts = [];
  for (const acct of accountsResponse.data.accounts) {
    const account = await prisma.account.upsert({
      where: { plaidAccountId: acct.account_id },
      update: {
        name: acct.name,
        officialName: acct.official_name ?? null,
        type: refineAccountType(acct.type, acct.subtype ?? null),
        subtype: acct.subtype ?? null,
        mask: acct.mask ?? null,
        currentBalance: acct.balances.current ?? 0,
        availableBalance: acct.balances.available ?? null,
        isoCurrencyCode: acct.balances.iso_currency_code ?? "USD",
        plaidAccessToken: encryptedToken,
        plaidItemId: itemId,
      },
      create: {
        userId: user.id,
        plaidAccountId: acct.account_id,
        plaidAccessToken: encryptedToken,
        plaidItemId: itemId,
        name: acct.name,
        officialName: acct.official_name ?? null,
        type: refineAccountType(acct.type, acct.subtype ?? null),
        subtype: acct.subtype ?? null,
        mask: acct.mask ?? null,
        currentBalance: acct.balances.current ?? 0,
        availableBalance: acct.balances.available ?? null,
        isoCurrencyCode: acct.balances.iso_currency_code ?? "USD",
      },
    });
    upsertedAccounts.push(account);
  }

  // 4. Pull 90 days of transactions
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const startDate = ninetyDaysAgo.toISOString().split("T")[0];
  const endDate = now.toISOString().split("T")[0];

  let allTransactions: any[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const txResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: 500, offset },
    });
    allTransactions = allTransactions.concat(txResponse.data.transactions);
    offset += txResponse.data.transactions.length;
    hasMore = allTransactions.length < txResponse.data.total_transactions;
  }

  // 5. Map account IDs for lookups
  const plaidToDbAccount = new Map<string, string>();
  for (const acct of upsertedAccounts) {
    if (acct.plaidAccountId) {
      plaidToDbAccount.set(acct.plaidAccountId, acct.id);
    }
  }

  // 6. Upsert transactions with categories
  for (const tx of allTransactions) {
    const accountId = plaidToDbAccount.get(tx.account_id);
    if (!accountId) continue;

    const categoryName = mapPlaidCategory(
      tx.personal_finance_category?.primary ?? "",
      tx.personal_finance_category?.detailed ?? undefined
    );

    const category = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: categoryName } },
      update: {},
      create: { userId: user.id, name: categoryName, isDefault: true },
    });

    await prisma.transaction.upsert({
      where: { plaidTransactionId: tx.transaction_id },
      update: {
        amount: tx.amount,
        name: tx.name,
        merchantName: tx.merchant_name ?? null,
        date: new Date(tx.date),
        pending: tx.pending,
        categoryId: category.id,
      },
      create: {
        userId: user.id,
        accountId,
        plaidTransactionId: tx.transaction_id,
        categoryId: category.id,
        amount: tx.amount,
        name: tx.name,
        merchantName: tx.merchant_name ?? null,
        date: new Date(tx.date),
        pending: tx.pending,
        isoCurrencyCode: tx.iso_currency_code ?? "USD",
      },
    });
  }

  return NextResponse.json({
    success: true,
    accounts: upsertedAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      mask: a.mask,
      currentBalance: a.currentBalance,
    })),
  });
}
