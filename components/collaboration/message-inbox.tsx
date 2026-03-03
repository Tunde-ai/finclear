"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    firstName: string | null;
    lastName: string | null;
    role: string;
    imageUrl: string | null;
  };
}

export function MessageInbox() {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/collaboration/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        setOrgId(data.organizationId);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !orgId) return;
    setSending(true);
    try {
      const res = await fetch("/api/collaboration/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage, organizationId: orgId }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading messages...
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-gray-500">
            No organization connected. Invite an accountant to start messaging.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" style={{ height: "calc(100vh - 200px)" }}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base">Shared Inbox</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const name = [msg.sender.firstName, msg.sender.lastName]
            .filter(Boolean)
            .join(" ") || "User";
          const isAccountant = msg.sender.role === "ACCOUNTANT";
          return (
            <div key={msg.id} className={`flex ${isAccountant ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  isAccountant
                    ? "bg-gray-100 text-gray-800"
                    : "bg-emerald-600 text-white"
                }`}
              >
                <p className={`text-xs font-medium mb-0.5 ${isAccountant ? "text-gray-500" : "text-emerald-100"}`}>
                  {name} ({isAccountant ? "Accountant" : "Client"})
                </p>
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isAccountant ? "text-gray-400" : "text-emerald-200"}`}>
                  {new Date(msg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </CardContent>
      <div className="border-t p-3">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()} size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
