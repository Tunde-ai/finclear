"use client";

import { useCallback, useEffect, useState } from "react";
import { MarketDayForm } from "@/components/jamaica-house/market-day-form";
import { SalesCharts } from "@/components/jamaica-house/sales-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function JamaicaHouseClient() {
  const [sales, setSales] = useState<never[]>([]);
  const [costs, setCosts] = useState<never[]>([]);
  const [ads, setAds] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [salesRes, costsRes, adsRes] = await Promise.all([
        fetch("/api/jamaica-house/sales"),
        fetch("/api/jamaica-house/costs"),
        fetch("/api/jamaica-house/ads"),
      ]);
      const [salesData, costsData, adsData] = await Promise.all([
        salesRes.json(),
        costsRes.json(),
        adsRes.json(),
      ]);
      setSales(salesData.sales ?? []);
      setCosts(costsData.costs ?? []);
      setAds(adsData.ads ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCostSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/jamaica-house/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: fd.get("date"),
        supplier: fd.get("supplier"),
        item: fd.get("item"),
        quantity: parseFloat(fd.get("quantity") as string),
        unitCost: parseFloat(fd.get("unitCost") as string),
        category: fd.get("category") || null,
      }),
    });
    setShowCostForm(false);
    fetchAll();
  };

  const handleAdSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/jamaica-house/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: fd.get("date"),
        platform: fd.get("platform"),
        campaign: fd.get("campaign") || null,
        spend: parseFloat(fd.get("spend") as string),
        impressions: fd.get("impressions") ? parseInt(fd.get("impressions") as string) : null,
        clicks: fd.get("clicks") ? parseInt(fd.get("clicks") as string) : null,
        revenue: fd.get("revenue") ? parseFloat(fd.get("revenue") as string) : null,
      }),
    });
    setShowAdForm(false);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Jamaica House Brand</h2>
          <p className="text-sm text-gray-500">Caribbean food products — Market & wholesale tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCostForm(!showCostForm)}>
            {showCostForm ? "Hide" : "Log COGS"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAdForm(!showAdForm)}>
            {showAdForm ? "Hide" : "Log Ad Spend"}
          </Button>
        </div>
      </div>

      <MarketDayForm onSaved={fetchAll} />

      {/* COGS Quick Entry */}
      {showCostForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log Cost of Goods</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCostSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required />
              <select name="supplier" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required>
                <option value="Costco">Costco</option>
                <option value="Winn Dixie">Winn Dixie</option>
                <option value="Amazon">Amazon</option>
                <option value="Restaurant Depot">Restaurant Depot</option>
                <option value="Other">Other</option>
              </select>
              <input name="item" type="text" placeholder="Item" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required />
              <input name="quantity" type="number" step="0.01" placeholder="Qty" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required />
              <input name="unitCost" type="number" step="0.01" placeholder="Unit Cost $" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required />
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ad Spend Quick Entry */}
      {showAdForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log Ad Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-7">
              <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required />
              <select name="platform" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required>
                <option value="Instagram">Instagram</option>
                <option value="Meta Ads">Meta Ads</option>
                <option value="Google Ads">Google Ads</option>
                <option value="TikTok">TikTok</option>
              </select>
              <input name="campaign" type="text" placeholder="Campaign" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              <input name="spend" type="number" step="0.01" placeholder="Spend $" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" required />
              <input name="clicks" type="number" placeholder="Clicks" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              <input name="revenue" type="number" step="0.01" placeholder="Revenue $" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Square POS Integration Placeholder */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between py-4 px-6">
          <div>
            <p className="text-sm font-medium text-gray-700">Square POS Integration</p>
            <p className="text-xs text-gray-400">Connect your Square account to auto-import market day sales</p>
          </div>
          <Button variant="outline" size="sm" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>

      <SalesCharts sales={sales} costs={costs} ads={ads} />
    </div>
  );
}
