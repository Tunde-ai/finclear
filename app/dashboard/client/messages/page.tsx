import { MessageInbox } from "@/components/collaboration/message-inbox";

export default function ClientMessagesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
      <MessageInbox />
    </div>
  );
}
