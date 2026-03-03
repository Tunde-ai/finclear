"use client";

import { useState } from "react";
import {
  FileText,
  Image,
  Sheet,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  parsedStatus: string;
  syncStatus: string | null;
  createdAt: string;
  user?: { firstName: string | null; lastName: string | null; email: string };
}

interface DocumentListProps {
  documents: DocumentItem[];
  onRefresh: () => void;
  showOwner?: boolean;
  canDelete?: boolean;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType === "text/csv") return Sheet;
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ParsedBadge({ status }: { status: string }) {
  switch (status) {
    case "PARSED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Parsed
        </span>
      );
    case "PARSING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" /> Parsing
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" /> Failed
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    default:
      return null;
  }
}

function SyncBadge({ status }: { status: string | null }) {
  if (!status) return null;
  switch (status) {
    case "SYNCED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <RefreshCw className="h-3 w-3" /> Synced
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    case "ERROR":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" /> Error
        </span>
      );
    default:
      return null;
  }
}

export function DocumentList({
  documents,
  onRefresh,
  showOwner = false,
  canDelete = true,
}: DocumentListProps) {
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDownload(doc: DocumentItem) {
    const res = await fetch(`/api/documents/${doc.id}/download`);
    const data = await res.json();
    if (data.url) {
      window.open(data.url, "_blank");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/documents/${deleteTarget.id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No documents yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Name
              </th>
              {showOwner && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Owner
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.mimeType);
              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  {showOwner && (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {doc.user
                        ? `${doc.user.firstName ?? ""} ${doc.user.lastName ?? ""}`.trim() ||
                          doc.user.email
                        : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatSize(doc.size)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ParsedBadge status={doc.parsedStatus} />
                      <SyncBadge status={doc.syncStatus} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(doc)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
