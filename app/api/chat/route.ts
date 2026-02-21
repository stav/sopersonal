import { streamText, UIMessage, convertToModelMessages } from "ai";
import { model } from "@/lib/ai/client";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { retrieveContext } from "@/lib/ai/rag";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Extract text from the last user message for RAG
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const lastUserText = lastUserMessage?.parts
    ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ") ?? "";

  let context: string | undefined;
  try {
    context = await retrieveContext(lastUserText);
  } catch {
    // RAG is optional — continue without context if it fails
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model,
    system: buildSystemPrompt(context),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
