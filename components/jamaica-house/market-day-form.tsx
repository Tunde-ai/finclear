"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LOCATIONS = ["Lake Nona", "Las Olas", "Fort Lauderdale", "Orlando"];
const PRODUCTS = [
  "Jerk Sauce",
  "Escovitch Sauce",
  "Jerk Seasoning",
  "Pepper Sauce",
  "Curry Powder",
  "Sorrel Drink",
  "Ginger Beer",
  "Plantain Chips",
  "Festival Mix",
  "Bammy",
];

interface LineItem {
  product: string;
  quantity: number;
  unitPrice: number;
}

export function MarketDayForm({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [saleType, setSaleType] = useState("RETAIL");
  const [vendorFee, setVendorFee] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { product: PRODUCTS[0], quantity: 1, unitPrice: 12 },
  ]);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  const addItem = () => {
    setItems([...items, { product: PRODUCTS[0], quantity: 1, unitPrice: 12 }]);
  };

  const removeItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const totalRevenue = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/jamaica-house/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          location,
          saleType,
          vendorFee: vendorFee ? parseFloat(vendorFee) : null,
          items,
          notes,
        }),
      });
      if (res.ok) {
        setItems([{ product: PRODUCTS[0], quantity: 1, unitPrice: 12 }]);
        setVendorFee("");
        setNotes("");
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Market Day Quick Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="RETAIL">Retail (Market)</option>
                <option value="WHOLESALE">Wholesale</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Vendor Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={vendorFee}
                onChange={(e) => setVendorFee(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Items Sold</label>
              <button type="button" onClick={addItem} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={item.product}
                  onChange={(e) => updateItem(i, "product", e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-center"
                  placeholder="Qty"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-md border border-gray-300 pl-5 pr-2 py-1.5 text-sm"
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium text-gray-700">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="text-sm font-semibold text-gray-900">
              Total: ${totalRevenue.toFixed(2)}
              {vendorFee && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  (Net: ${(totalRevenue - parseFloat(vendorFee || "0")).toFixed(2)})
                </span>
              )}
            </div>
            <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Log Sales
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
