"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  Bot,
  Settings,
  UserPlus,
  Users,
  TrendingUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth";

const clientNav = [
  { name: "Dashboard", href: "/dashboard/client", icon: LayoutDashboard },
  {
    name: "Transactions",
    href: "/dashboard/client/transactions",
    icon: ArrowLeftRight,
  },
  { name: "Accounts", href: "/dashboard/client/accounts", icon: Wallet },
  { name: "Budgets", href: "/dashboard/client/budgets", icon: PiggyBank },
  { name: "AI Insights", href: "/dashboard/client/insights", icon: Bot },
  { name: "Documents", href: "/dashboard/client/documents", icon: FileText },
  {
    name: "Invite Accountant",
    href: "/dashboard/client/invite",
    icon: UserPlus,
  },
  { name: "Settings", href: "/dashboard/client/settings", icon: Settings },
];

const accountantNav = [
  {
    name: "Dashboard",
    href: "/dashboard/accountant",
    icon: LayoutDashboard,
  },
  { name: "Clients", href: "/dashboard/accountant/clients", icon: Users },
  {
    name: "Transactions",
    href: "/dashboard/accountant/clients",
    icon: ArrowLeftRight,
  },
  { name: "Insights", href: "/dashboard/accountant/clients", icon: TrendingUp },
  { name: "Documents", href: "/dashboard/accountant/documents", icon: FileText },
  {
    name: "Settings",
    href: "/dashboard/accountant/settings",
    icon: Settings,
  },
];

export function RoleSidebar({ role }: { role: UserRole | null }) {
  const pathname = usePathname();
  const navigation = role === "ACCOUNTANT" ? accountantNav : clientNav;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">FC</span>
        </div>
        <span className="text-xl font-bold text-gray-900">FinClear</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            item.href === pathname ||
            (item.href !== "/dashboard/client" &&
              item.href !== "/dashboard/accountant" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      {role && (
        <div className="border-t border-gray-200 p-4">
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
            {role === "ACCOUNTANT" ? "Accountant" : "Client"} Account
          </div>
        </div>
      )}
    </aside>
  );
}
