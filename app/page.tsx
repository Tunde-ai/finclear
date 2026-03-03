import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">FC</span>
          </div>
          <span className="text-xl font-bold">FinClear</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-gray-900">
            Your finances,{" "}
            <span className="text-emerald-600">crystal clear</span>
          </h1>
          <p className="max-w-xl text-lg text-gray-600">
            Connect your bank accounts, track spending, set budgets, and get
            AI-powered insights — all in one place.
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Start for Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </section>

        <section className="grid gap-8 px-6 py-16 md:grid-cols-3 max-w-5xl mx-auto">
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <div className="rounded-full bg-emerald-50 p-3">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Smart Analytics</h3>
            <p className="text-sm text-gray-600">
              AI-powered spending analysis and personalized financial insights.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <div className="rounded-full bg-emerald-50 p-3">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Bank-Grade Security</h3>
            <p className="text-sm text-gray-600">
              256-bit encryption and secure bank connections via Plaid.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center p-6">
            <div className="rounded-full bg-emerald-50 p-3">
              <Zap className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Real-Time Sync</h3>
            <p className="text-sm text-gray-600">
              Automatic transaction sync from all your connected accounts.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} FinClear. All rights reserved.
      </footer>
    </div>
  );
}
