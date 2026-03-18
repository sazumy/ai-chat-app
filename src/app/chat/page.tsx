import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import ChatWindow from "@/components/ChatWindow";
import Header from "@/components/Header";
import type { Message } from "@/components/MessageBubble";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = session.user.id;

  // 最新の ChatSession を取得
  const chatSession = await prisma.chatSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // セッションがあれば履歴を取得
  const dbMessages = chatSession
    ? await prisma.message.findMany({
        where: { chatSessionId: chatSession.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, imageData: true },
      })
    : [];

  const initialMessages: Message[] = dbMessages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    imageData: m.imageData,
  }));

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-2xl flex-col">
          <ChatWindow
            initialMessages={initialMessages}
            initialSessionId={chatSession?.id ?? null}
          />
        </div>
      </main>
    </div>
  );
}
