"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { DocumentList } from "@/components/documents/document-list";
import { GoogleDrivePanel } from "@/components/documents/google-drive-panel";

export function DocumentsPageClient() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Documents</h2>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <UploadDropzone onUploadComplete={fetchDocuments} />
          {loading ? (
            <div className="text-sm text-gray-500">Loading documents...</div>
          ) : (
            <DocumentList
              documents={documents}
              onRefresh={fetchDocuments}
              canDelete
            />
          )}
        </div>
        <div>
          <GoogleDrivePanel onSyncComplete={fetchDocuments} />
        </div>
      </div>
    </div>
  );
}
