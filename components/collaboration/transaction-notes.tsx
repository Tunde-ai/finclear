"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Send, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoteData {
  id: string;
  content: string;
  createdAt: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  replies: NoteData[];
}

interface TransactionNotesProps {
  transactionId: string;
  flagStatus?: "NEEDS_REVIEW" | "APPROVED" | null;
  onFlagChange?: () => void;
}

export function TransactionNotes({ transactionId, flagStatus, onFlagChange }: TransactionNotesProps) {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/collaboration/notes?transactionId=${transactionId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyText : newNote;
    if (!content.trim()) return;
    setSending(true);
    try {
      await fetch("/api/collaboration/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, content, parentId }),
      });
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setNewNote("");
      }
      fetchNotes();
    } finally {
      setSending(false);
    }
  };

  const handleFlag = async (status: "NEEDS_REVIEW" | "APPROVED") => {
    await fetch("/api/collaboration/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, status }),
    });
    onFlagChange?.();
  };

  return (
    <div className="space-y-3">
      {/* Flag Actions */}
      <div className="flex gap-2">
        <Button
          variant={flagStatus === "NEEDS_REVIEW" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFlag("NEEDS_REVIEW")}
          className={flagStatus === "NEEDS_REVIEW" ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Needs Review
        </Button>
        <Button
          variant={flagStatus === "APPROVED" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFlag("APPROVED")}
          className={flagStatus === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Approved
        </Button>
      </div>

      {/* Notes Thread */}
      {loading ? (
        <div className="flex items-center text-xs text-gray-400">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Loading notes...
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const name = [note.user.firstName, note.user.lastName].filter(Boolean).join(" ") || "User";
            return (
              <div key={note.id} className="space-y-1">
                <div className="rounded-md bg-gray-50 p-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${note.user.role === "ACCOUNTANT" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      {note.user.role === "ACCOUNTANT" ? "Accountant" : "Client"}
                    </span>
                    <span className="text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{note.content}</p>
                  <button
                    onClick={() => setReplyTo(replyTo === note.id ? null : note.id)}
                    className="text-[10px] text-emerald-600 hover:underline mt-1"
                  >
                    <MessageCircle className="inline h-3 w-3 mr-0.5" />
                    Reply ({note.replies?.length || 0})
                  </button>
                </div>

                {/* Replies */}
                {note.replies?.map((reply) => {
                  const rName = [reply.user.firstName, reply.user.lastName].filter(Boolean).join(" ") || "User";
                  return (
                    <div key={reply.id} className="ml-6 rounded-md bg-gray-50/50 border-l-2 border-emerald-200 p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-gray-600">{rName}</span>
                        <span className="text-gray-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{reply.content}</p>
                    </div>
                  );
                })}

                {/* Reply Form */}
                {replyTo === note.id && (
                  <div className="ml-6 flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit(note.id)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleSubmit(note.id)} disabled={sending} className="h-7 w-7">
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Note */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button size="sm" onClick={() => handleSubmit()} disabled={sending || !newNote.trim()}>
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
