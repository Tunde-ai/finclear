import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.sharedReportLink.findUnique({
    where: { token },
    include: {
      report: {
        select: { title: true, content: true, createdAt: true, status: true },
      },
    },
  });

  if (!link || link.report.status !== "COMPLETED") {
    notFound();
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Link Expired</h1>
          <p className="text-sm text-gray-500 mt-2">This shared report link has expired.</p>
        </div>
      </div>
    );
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(link.report.createdAt));

  // Simple markdown-to-HTML rendering for read-only view
  const htmlContent = link.report.content
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-emerald-700 mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/^\- (.+)$/gm, '<li class="text-sm text-gray-700 ml-4">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-sm text-gray-700 ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-sm text-gray-700 mb-3 leading-relaxed">')
    .replace(/\n/g, "<br />");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">FC</span>
          </div>
          <span className="text-lg font-bold text-gray-900">FinClear</span>
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            Shared Report
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{link.report.title}</h1>
          <p className="text-xs text-gray-400 mb-6">Generated on {formattedDate}</p>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          This is a read-only shared report from FinClear. No login required.
        </p>
      </div>
    </div>
  );
}
