"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "xlsx", "csv"];
const MAX_SIZE_MB = 25;

interface UploadDropzoneProps {
  onUploadComplete: () => void;
}

export function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<
    Array<{ name: string; status: "uploading" | "done" | "error"; message?: string }>
  >([]);

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        setUploads((prev) => [
          ...prev,
          { name: file.name, status: "error", message: "Unsupported file type" },
        ]);
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploads((prev) => [
          ...prev,
          { name: file.name, status: "error", message: `Exceeds ${MAX_SIZE_MB}MB limit` },
        ]);
        return;
      }

      setUploads((prev) => [...prev, { name: file.name, status: "uploading" }]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name && u.status === "uploading"
              ? { ...u, status: "done" }
              : u
          )
        );
        onUploadComplete();
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name && u.status === "uploading"
              ? { ...u, status: "error", message: err instanceof Error ? err.message : "Failed" }
              : u
          )
        );
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      files.forEach(uploadFile);
      e.target.value = "";
    },
    [uploadFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <Upload className={`h-10 w-10 ${isDragging ? "text-emerald-500" : "text-gray-400"}`} />
        <p className="mt-2 text-sm font-medium text-gray-700">
          Drag & drop files here
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, JPG, PNG, XLSX, CSV (max {MAX_SIZE_MB}MB)
        </p>
        <label className="mt-3 cursor-pointer rounded-md bg-white px-3 py-1.5 text-sm font-medium text-emerald-600 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50">
          Browse files
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
            multiple
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, i) => (
            <div
              key={`${upload.name}-${i}`}
              className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="flex-1 truncate">{upload.name}</span>
              {upload.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              )}
              {upload.status === "done" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              {upload.status === "error" && (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {upload.message}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
