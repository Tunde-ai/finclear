import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { ClientDashboardActions } from "./client-dashboard-actions";

export default async function ClientDashboardPage() {
  const { userId: clerkId } = await auth();

  let accounts: any[] = [];
  let totalBalance = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      accounts = await prisma.account.findMany({
        where: { userId: user.id, isActive: true },
      });

      totalBalance = accounts.reduce(
        (sum, a) => sum + Number(a.currentBalance),
        0
      );

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: startOfMonth },
        },
      });

      for (const tx of transactions) {
        const amt = Number(tx.amount);
        if (amt < 0) {
          monthlyIncome += Math.abs(amt);
        } else {
          monthlyExpenses += amt;
        }
      }
    }
  }

  const hasAccounts = accounts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        {!hasAccounts && <ClientDashboardActions />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Net Worth
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500">
              {hasAccounts ? `Across ${accounts.length} account(s)` : "Connect accounts to begin"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Income
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${monthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${monthlyExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Accounts
            </CardTitle>
            <Wallet className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-gray-500">Connected</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
