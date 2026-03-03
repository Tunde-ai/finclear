"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Sale {
  id: string;
  date: string;
  location: string;
  product: string;
  quantity: number;
  unitPrice: string;
  totalSale: string;
  saleType: string;
  vendorFee: string | null;
}

interface CostItem {
  id: string;
  date: string;
  supplier: string;
  item: string;
  totalCost: string;
}

interface Ad {
  id: string;
  date: string;
  platform: string;
  spend: string;
  revenue: string | null;
  clicks: number | null;
  impressions: number | null;
}

const COLORS = ["#d97706", "#059669", "#2563eb", "#dc2626", "#7c3aed", "#ec4899", "#f59e0b", "#10b981"];

export function SalesCharts({
  sales,
  costs,
  ads,
}: {
  sales: Sale[];
  costs: CostItem[];
  ads: Ad[];
}) {
  const salesByLocation = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      map[s.location] = (map[s.location] || 0) + parseFloat(s.totalSale);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [sales]);

  const productPerformance = useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {};
    sales.forEach((s) => {
      if (!map[s.product]) map[s.product] = { revenue: 0, units: 0 };
      map[s.product].revenue += parseFloat(s.totalSale);
      map[s.product].units += s.quantity;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, revenue: +d.revenue.toFixed(2), units: d.units }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const wholesaleVsRetail = useMemo(() => {
    let retail = 0;
    let wholesale = 0;
    sales.forEach((s) => {
      if (s.saleType === "WHOLESALE") wholesale += parseFloat(s.totalSale);
      else retail += parseFloat(s.totalSale);
    });
    return [
      { name: "Retail", value: +retail.toFixed(2) },
      { name: "Wholesale", value: +wholesale.toFixed(2) },
    ].filter((d) => d.value > 0);
  }, [sales]);

  const weeklyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const d = new Date(s.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      map[key] = (map[key] || 0) + parseFloat(s.totalSale);
    });
    return Object.entries(map)
      .map(([week, revenue]) => ({ week, revenue: +revenue.toFixed(2) }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12);
  }, [sales]);

  const cogsBySupplier = useMemo(() => {
    const map: Record<string, number> = {};
    costs.forEach((c) => {
      map[c.supplier] = (map[c.supplier] || 0) + parseFloat(c.totalCost);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [costs]);

  const totalRevenue = sales.reduce((s, r) => s + parseFloat(r.totalSale), 0);
  const totalCogs = costs.reduce((s, c) => s + parseFloat(c.totalCost), 0);
  const totalVendorFees = sales.reduce((s, r) => s + parseFloat(r.vendorFee || "0"), 0);
  const totalAdSpend = ads.reduce((s, a) => s + parseFloat(a.spend), 0);
  const totalAdRevenue = ads.reduce((s, a) => s + parseFloat(a.revenue || "0"), 0);

  const adRoiData = useMemo(() => {
    const map: Record<string, { spend: number; revenue: number }> = {};
    ads.forEach((a) => {
      if (!map[a.platform]) map[a.platform] = { spend: 0, revenue: 0 };
      map[a.platform].spend += parseFloat(a.spend);
      map[a.platform].revenue += parseFloat(a.revenue || "0");
    });
    return Object.entries(map).map(([platform, d]) => ({
      platform,
      spend: +d.spend.toFixed(2),
      revenue: +d.revenue.toFixed(2),
      roi: d.spend > 0 ? +(((d.revenue - d.spend) / d.spend) * 100).toFixed(1) : 0,
    }));
  }, [ads]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Cost of Goods</p>
            <p className="text-xl font-bold text-gray-900">${totalCogs.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Vendor Fees</p>
            <p className="text-xl font-bold text-gray-900">${totalVendorFees.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-gray-500">Net Profit</p>
            <p className={`text-xl font-bold ${totalRevenue - totalCogs - totalVendorFees - totalAdSpend >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              ${(totalRevenue - totalCogs - totalVendorFees - totalAdSpend).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sales by Location</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByLocation.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesByLocation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                  <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-12 text-center">No sales data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Product Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {productPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-12 text-center">No product data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Wholesale vs Retail</CardTitle>
          </CardHeader>
          <CardContent>
            {wholesaleVsRetail.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={wholesaleVsRetail} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {wholesaleVsRetail.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-12 text-center">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">COGS by Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            {cogsBySupplier.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={cogsBySupplier} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {cogsBySupplier.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-12 text-center">No cost data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ad Spend vs Revenue (ROI)</CardTitle>
          </CardHeader>
          <CardContent>
            {adRoiData.length > 0 ? (
              <div className="space-y-3">
                {adRoiData.map((d) => (
                  <div key={d.platform} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{d.platform}</span>
                      <span className={d.roi >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {d.roi >= 0 ? "+" : ""}{d.roi}% ROI
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>Spend: ${d.spend}</span>
                      <span>Rev: ${d.revenue}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-xs font-medium">
                  <span>Total Ad Spend: ${totalAdSpend.toFixed(2)}</span>
                  <span>Total Ad Rev: ${totalAdRevenue.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-12 text-center">No ad data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Weekly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 py-12 text-center">Not enough data for trend</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
