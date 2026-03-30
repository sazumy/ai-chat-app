import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // ── 認証チェック ────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const userId = session.user.id;

  // ── クエリパラメータ解析 ─────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  try {
    let chatSession;

    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
      });
    } else {
      // 未指定の場合は最新セッションを返す
      chatSession = await prisma.chatSession.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!chatSession) {
      return new Response(JSON.stringify({ messages: [], sessionId: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = await prisma.message.findMany({
      where: { chatSessionId: chatSession.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, imageData: true },
    });

    return new Response(
      JSON.stringify({ messages, sessionId: chatSession.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[/api/messages] error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
