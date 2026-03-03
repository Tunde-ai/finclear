import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountsActions } from "./accounts-actions";

export default async function AccountsPage() {
  const { userId: clerkId } = await auth();

  let accounts: { id: string; name: string; type: string; mask: string | null; currentBalance: unknown; availableBalance: unknown }[] = [];
  if (clerkId) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (user) {
      accounts = await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
        <AccountsActions />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              No accounts connected yet. Click &quot;Link Account&quot; to connect
              your bank via Plaid.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  {account.name}
                </CardTitle>
                <p className="text-xs text-gray-500">
                  {account.type}{account.mask ? ` ••••${account.mask}` : ""}
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(account.currentBalance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                {account.availableBalance !== null && (
                  <p className="text-xs text-gray-500">
                    Available: $
                    {Number(account.availableBalance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
