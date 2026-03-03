"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, ArrowLeft, Download, Eye } from "lucide-react";

interface ReportGeneratorProps {
  type: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  onDone: (reportId: string) => void;
  onBack: () => void;
}

export function ReportGenerator({
  type,
  dateRangeStart,
  dateRangeEnd,
  onDone,
  onBack,
}: ReportGeneratorProps) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"generating" | "done" | "error">(
    "generating"
  );
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const generate = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dateRangeStart, dateRangeEnd }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate report");
        setStatus("error");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Streaming not supported");
        setStatus("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.reportId) {
              setReportId(data.reportId);
            }
            if (data.text) {
              setContent((prev) => prev + data.text);
            }
            if (data.done) {
              setStatus("done");
            }
            if (data.error) {
              setError(data.error);
              setStatus("error");
            }
          } catch {
            // Skip malformed SSE data
          }
        }
      }

      // If we haven't set done yet from SSE events, check if stream ended cleanly
      setStatus((prev) => (prev === "generating" ? "done" : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("error");
    }
  }, [type, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    generate();
  }, [generate]);

  // Auto-scroll during generation
  useEffect(() => {
    if (status === "generating" && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        {status === "generating" && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating report...
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {status === "error" && !content && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Generation Failed
                </p>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
              </div>
              <Button variant="outline" onClick={() => { setContent(""); setStatus("generating"); startedRef.current = false; }}>
                Retry
              </Button>
            </div>
          )}

          {(content || status === "generating") && (
            <div
              ref={contentRef}
              className="prose prose-sm max-w-none max-h-[60vh] overflow-y-auto"
            >
              <Markdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-gray-900 mb-4 mt-6 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-emerald-700 mb-3 mt-5">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 mb-3 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-gray-700">{children}</li>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-emerald-50">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-xs text-gray-600 border-b border-gray-100">
                      {children}
                    </td>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                }}
              >
                {content}
              </Markdown>
              {status === "generating" && (
                <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-0.5" />
              )}
            </div>
          )}

          {status === "done" && reportId && (
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDone(reportId)}
              >
                <Eye className="mr-1 h-4 w-4" />
                View Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`/api/reports/${reportId}/pdf`, "_blank")
                }
              >
                <Download className="mr-1 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
