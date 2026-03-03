import { UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">FinClear</h1>
      </div>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
}
