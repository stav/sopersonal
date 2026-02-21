"use client";

import type { UIMessage } from "ai";

interface MessageBubbleProps {
  message: UIMessage;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = getMessageText(message);

  if (!text) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
  );
}
