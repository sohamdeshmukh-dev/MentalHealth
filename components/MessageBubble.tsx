"use client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-[0_4px_14px_rgba(2,6,23,0.18)] transition-colors ${
          isUser
            ? "border border-teal-500/35 bg-teal-500/18 text-[var(--foreground)]"
            : "border border-[var(--border-soft)] bg-[var(--surface-1)] text-[var(--foreground)]"
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p className="mt-2 text-[11px] text-[var(--subtle-text)]">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}
