import { ChatInterface } from "@/components/chat/chat-interface";

export const metadata = {
  title: "Chat — SoPersonal",
};

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <ChatInterface />
    </div>
  );
}
