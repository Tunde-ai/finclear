"use client";

import { useCallback, useEffect, useState } from "react";
import { DocumentList } from "@/components/documents/document-list";

export function AccountantDocumentsClient() {
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
      <h2 className="text-2xl font-bold text-gray-900">Client Documents</h2>
      <p className="text-sm text-gray-500">
        View all documents uploaded by your clients.
      </p>
      {loading ? (
        <div className="text-sm text-gray-500">Loading documents...</div>
      ) : (
        <DocumentList
          documents={documents}
          onRefresh={fetchDocuments}
          showOwner
          canDelete={false}
        />
      )}
    </div>
  );
}
