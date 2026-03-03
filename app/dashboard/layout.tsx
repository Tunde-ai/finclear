import { auth } from "@clerk/nextjs/server";
import { RoleSidebar } from "@/components/layout/role-sidebar";
import { Header } from "@/components/layout/header";
import type { UserRole } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata?.role as UserRole) ?? null;

  return (
    <div className="flex h-screen">
      <RoleSidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
