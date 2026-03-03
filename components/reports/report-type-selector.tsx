"use client";

import { useState } from "react";
import { FileBarChart, Receipt, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ReportType =
  | "MONTHLY_PL"
  | "TAX_DEDUCTIONS"
  | "CASH_FLOW_FORECAST"
  | "BUSINESS_HEALTH_SCORE";

interface ReportOption {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hasDateRange: boolean;
}

const reportOptions: ReportOption[] = [
  {
    type: "MONTHLY_PL",
    title: "Monthly P&L",
    description:
      "Revenue vs expenses grouped by category with net income analysis.",
    icon: FileBarChart,
    color: "text-blue-600 bg-blue-50",
    hasDateRange: true,
  },
  {
    type: "TAX_DEDUCTIONS",
    title: "Tax Deductions",
    description:
      "Identify deductible transactions with confidence ratings and savings estimates.",
    icon: Receipt,
    color: "text-amber-600 bg-amber-50",
    hasDateRange: true,
  },
  {
    type: "CASH_FLOW_FORECAST",
    title: "Cash Flow Forecast",
    description:
      "30/60/90 day projections based on recurring patterns and trends.",
    icon: TrendingUp,
    color: "text-emerald-600 bg-emerald-50",
    hasDateRange: false,
  },
  {
    type: "BUSINESS_HEALTH_SCORE",
    title: "Business Health Score",
    description:
      "6-dimension financial health assessment with an overall 0-100 score.",
    icon: Activity,
    color: "text-purple-600 bg-purple-50",
    hasDateRange: false,
  },
];

interface ReportTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (params: {
    type: ReportType;
    dateRangeStart?: string;
    dateRangeEnd?: string;
  }) => void;
}

export function ReportTypeSelector({
  open,
  onClose,
  onSelect,
}: ReportTypeSelectorProps) {
  const [selected, setSelected] = useState<ReportOption | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const handleGenerate = () => {
    if (!selected) return;
    onSelect({
      type: selected.type,
      ...(selected.hasDateRange && dateStart ? { dateRangeStart: dateStart } : {}),
      ...(selected.hasDateRange && dateEnd ? { dateRangeEnd: dateEnd } : {}),
    });
    setSelected(null);
    setDateStart("");
    setDateEnd("");
  };

  const handleClose = () => {
    setSelected(null);
    setDateStart("");
    setDateEnd("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Choose a report type to generate from your financial data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {reportOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selected?.type === option.type;
            return (
              <button
                key={option.type}
                onClick={() => setSelected(option)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`mt-0.5 rounded-lg p-2 ${option.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {option.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selected?.hasDateRange && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500">
                Start Date (optional)
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500">
                End Date (optional)
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!selected}>
            Generate Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
