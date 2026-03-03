"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportTypeSelector } from "@/components/reports/report-type-selector";
import { ReportGenerator } from "@/components/reports/report-generator";
import { ReportHistoryList } from "@/components/reports/report-history-list";
import { ReportViewer } from "@/components/reports/report-viewer";

type View = "list" | "generating" | "viewing";

interface GenerateParams {
  type: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export function ReportsPageClient() {
  const [view, setView] = useState<View>("list");
  const [reports, setReports] = useState<
    {
      id: string;
      type: "MONTHLY_PL" | "TAX_DEDUCTIONS" | "CASH_FLOW_FORECAST" | "BUSINESS_HEALTH_SCORE";
      status: "GENERATING" | "COMPLETED" | "FAILED";
      title: string;
      createdAt: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [generateParams, setGenerateParams] = useState<GenerateParams | null>(
    null
  );
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSelectType = (params: GenerateParams) => {
    setSelectorOpen(false);
    setGenerateParams(params);
    setView("generating");
  };

  const handleGenerationDone = (reportId: string) => {
    setViewingReportId(reportId);
    setView("viewing");
    fetchReports();
  };

  const handleViewReport = (id: string) => {
    setViewingReportId(id);
    setView("viewing");
  };

  const handleBackToList = () => {
    setView("list");
    setGenerateParams(null);
    setViewingReportId(null);
    fetchReports();
  };

  return (
    <div className="space-y-6">
      {view === "list" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
            <Button onClick={() => setSelectorOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Generate Report
            </Button>
          </div>

          <ReportHistoryList
            reports={reports}
            loading={loading}
            onView={handleViewReport}
          />

          <ReportTypeSelector
            open={selectorOpen}
            onClose={() => setSelectorOpen(false)}
            onSelect={handleSelectType}
          />
        </>
      )}

      {view === "generating" && generateParams && (
        <ReportGenerator
          type={generateParams.type}
          dateRangeStart={generateParams.dateRangeStart}
          dateRangeEnd={generateParams.dateRangeEnd}
          onDone={handleGenerationDone}
          onBack={handleBackToList}
        />
      )}

      {view === "viewing" && viewingReportId && (
        <ReportViewer reportId={viewingReportId} onBack={handleBackToList} />
      )}
    </div>
  );
}
