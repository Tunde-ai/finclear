"use client";

import {
  FileBarChart,
  Receipt,
  TrendingUp,
  Activity,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type ReportType =
  | "MONTHLY_PL"
  | "TAX_DEDUCTIONS"
  | "CASH_FLOW_FORECAST"
  | "BUSINESS_HEALTH_SCORE";

type ReportStatus = "GENERATING" | "COMPLETED" | "FAILED";

interface ReportSummary {
  id: string;
  type: ReportType;
  status: ReportStatus;
  title: string;
  createdAt: string;
}

const typeConfig: Record<
  ReportType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  MONTHLY_PL: {
    icon: FileBarChart,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  TAX_DEDUCTIONS: {
    icon: Receipt,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  CASH_FLOW_FORECAST: {
    icon: TrendingUp,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  BUSINESS_HEALTH_SCORE: {
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
};

const statusConfig: Record<
  ReportStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
  }
> = {
  COMPLETED: {
    icon: CheckCircle2,
    label: "Completed",
    className: "text-emerald-700 bg-emerald-50",
  },
  GENERATING: {
    icon: Loader2,
    label: "Generating",
    className: "text-amber-700 bg-amber-50",
  },
  FAILED: {
    icon: AlertCircle,
    label: "Failed",
    className: "text-red-700 bg-red-50",
  },
};

interface ReportHistoryListProps {
  reports: ReportSummary[];
  loading: boolean;
  onView: (id: string) => void;
}

export function ReportHistoryList({
  reports,
  loading,
  onView,
}: ReportHistoryListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading reports...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileBarChart className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900">No reports yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Generate your first AI-powered financial report.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => {
        const tConfig = typeConfig[report.type];
        const sConfig = statusConfig[report.status];
        const Icon = tConfig.icon;
        const StatusIcon = sConfig.icon;

        return (
          <Card key={report.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg p-2 ${tConfig.bgColor}`}>
                <Icon className={`h-5 w-5 ${tConfig.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {report.title}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(report.createdAt)}
                </p>
              </div>

              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${sConfig.className}`}
              >
                <StatusIcon
                  className={`h-3 w-3 ${report.status === "GENERATING" ? "animate-spin" : ""}`}
                />
                {sConfig.label}
              </div>

              <div className="flex gap-1">
                {report.status === "COMPLETED" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(report.id)}
                      title="View report"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        window.open(`/api/reports/${report.id}/pdf`, "_blank")
                      }
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
