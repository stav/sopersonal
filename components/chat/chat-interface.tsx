"use client";

import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { VoiceButton } from "./voice-button";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatInterface() {
  const { messages, sendMessage, status, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  const handleTranscript = useCallback(
    (text: string) => sendMessage({ text }),
    [sendMessage]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="chat-messages scrollbar-hide flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 text-4xl">👶</div>
            <h2 className="mb-2 text-lg font-semibold">Welcome to SoPersonal</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Your AI parenting companion. Ask me anything about raising kids — or tap the mic to talk.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {error.message || "Something went wrong. Please try again."}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Voice button */}
      <div className="flex justify-center py-2">
        <VoiceButton
          onTranscript={handleTranscript}
          isProcessing={isLoading}
          lastAssistantMessage={
            lastAssistantMessage ? getMessageText(lastAssistantMessage) : undefined
          }
        />
      </div>

      {/* Text input */}
      <ChatInput
        onSend={(text) => sendMessage({ text })}
        isDisabled={isLoading}
      />
    </div>
  );
}
