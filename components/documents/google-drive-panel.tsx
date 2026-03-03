"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, HardDrive, FolderOpen, Unlink, Loader2, CheckCircle2 } from "lucide-react";

interface DriveStatus {
  connected: boolean;
  folderId?: string;
  folderName?: string;
  lastSyncAt?: string;
}

interface Folder {
  id: string;
  name: string;
}

interface GoogleDrivePanelProps {
  onSyncComplete: () => void;
}

export function GoogleDrivePanel({ onSyncComplete }: GoogleDrivePanelProps) {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/google-drive/status");
    const data = await res.json();
    setStatus(data);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    const res = await fetch("/api/google-drive/auth");
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }

  async function handleDisconnect() {
    await fetch("/api/google-drive/status", { method: "DELETE" });
    setStatus({ connected: false });
    setFolders([]);
    setShowFolderPicker(false);
  }

  async function loadFolders() {
    setLoadingFolders(true);
    setShowFolderPicker(true);
    try {
      const res = await fetch("/api/google-drive/folders");
      const data = await res.json();
      setFolders(data.folders ?? []);
    } finally {
      setLoadingFolders(false);
    }
  }

  async function selectFolder(folderId: string, folderName: string) {
    await fetch("/api/google-drive/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, folderName }),
    });
    setStatus((prev) => (prev ? { ...prev, folderId, folderName } : prev));
    setShowFolderPicker(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/google-drive/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(`Synced ${data.synced} file(s)`);
      onSyncComplete();
      fetchStatus();
    } catch {
      setSyncResult("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!status) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          Google Drive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!status.connected ? (
          <div>
            <p className="text-sm text-gray-500 mb-3">
              Connect Google Drive to sync documents from a folder.
            </p>
            <Button onClick={handleConnect} variant="outline" className="gap-2">
              <HardDrive className="h-4 w-4" />
              Connect Google Drive
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-gray-700">Connected</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                className="ml-auto text-xs text-gray-400 hover:text-red-500"
              >
                <Unlink className="h-3 w-3 mr-1" />
                Disconnect
              </Button>
            </div>

            {status.folderName ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FolderOpen className="h-4 w-4" />
                <span>Folder: {status.folderName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadFolders}
                  className="text-xs"
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={loadFolders} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Select Folder
              </Button>
            )}

            {showFolderPicker && (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 max-h-48 overflow-y-auto">
                {loadingFolders ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading folders...
                  </div>
                ) : folders.length === 0 ? (
                  <p className="text-sm text-gray-500">No folders found</p>
                ) : (
                  <div className="space-y-1">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => selectFolder(folder.id, folder.name)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 text-left"
                      >
                        <FolderOpen className="h-4 w-4 shrink-0" />
                        {folder.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {status.folderId && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  size="sm"
                  className="gap-2"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {syncing ? "Syncing..." : "Sync Now"}
                </Button>
                {status.lastSyncAt && (
                  <span className="text-xs text-gray-400">
                    Last: {new Date(status.lastSyncAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {syncResult && (
              <p className="text-sm text-emerald-600">{syncResult}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
