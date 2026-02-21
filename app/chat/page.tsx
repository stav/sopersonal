import { ChatInterface } from "@/components/chat/chat-interface";
import { ChatHeader } from "@/components/chat/chat-header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat — SoPersonal",
};

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <ChatInterface />
    </div>
  );
}
