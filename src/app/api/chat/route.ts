import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { anthropic } from "@/lib/ai/client";
import { SYSTEM_PROMPT, MODEL, MAX_TOKENS, MAX_CONTEXT_TURNS } from "@/lib/ai/persona";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function sseChunk(data: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function sseDone(): Uint8Array {
  return encoder.encode("data: [DONE]\n\n");
}

type SupportedMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const SUPPORTED_MIME_TYPES: readonly SupportedMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

function buildMessageContent(
  text: string,
  imageDataUrl: string | null
): Anthropic.MessageParam["content"] {
  if (!imageDataUrl) return text;

  const parsed = parseDataUrl(imageDataUrl);
  const blocks: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [];

  if (parsed && SUPPORTED_MIME_TYPES.includes(parsed.mimeType as SupportedMimeType)) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsed.mimeType as SupportedMimeType,
        data: parsed.data,
      },
    });
  }

  if (text.trim()) {
    blocks.push({ type: "text", text: text.trim() });
  }

  return blocks.length > 0 ? blocks : text;
}

export async function POST(req: Request) {
  // ── 認証チェック ────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  const userId = session.user.id;

  // ── リクエスト解析 ───────────────────────────────────────────────
  let message: string;
  let sessionId: string | null;
  let imageData: string | null;
  try {
    const body = await req.json();
    message = typeof body.message === "string" ? body.message : "";
    sessionId = body.sessionId ?? null;
    imageData = typeof body.imageData === "string" ? body.imageData : null;

    if (!message.trim() && !imageData) {
      throw new Error("Either message or image is required");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Bad Request" }), {
      status: 400,
    });
  }

  // ── ChatSession 取得 / 作成 ──────────────────────────────────────
  let chatSession;
  if (sessionId) {
    chatSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
    });
  }
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: { userId },
    });
  }

  // ── 会話履歴取得（直近 MAX_CONTEXT_TURNS ターン） ────────────────
  const history = await prisma.message.findMany({
    where: { chatSessionId: chatSession.id },
    orderBy: { createdAt: "desc" },
    take: MAX_CONTEXT_TURNS,
    select: { role: true, content: true, imageData: true },
  });
  history.reverse();

  // ── ユーザーメッセージを DB 保存 ─────────────────────────────────
  await prisma.message.create({
    data: {
      chatSessionId: chatSession.id,
      userId,
      role: "user",
      content: message.trim(),
      imageData,
    },
  });

  // ── ストリーミングレスポンス構築 ─────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // セッション ID を最初に送信
        controller.enqueue(
          sseChunk({ type: "session", sessionId: chatSession.id })
        );

        // Claude API ストリーミング開始
        const claudeMessages: Anthropic.MessageParam[] = [
          ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: buildMessageContent(m.content, m.imageData ?? null),
          })),
          {
            role: "user" as const,
            content: buildMessageContent(message.trim(), imageData),
          },
        ];

        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: claudeMessages,
        });

        let accumulated = "";

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            accumulated += text;
            controller.enqueue(sseChunk({ type: "delta", text }));
          }
        }

        // ストリーム完了後にアシスタントメッセージを DB 保存
        if (accumulated) {
          await prisma.message.create({
            data: {
              chatSessionId: chatSession.id,
              userId,
              role: "assistant",
              content: accumulated,
            },
          });
        }

        controller.enqueue(sseDone());
        controller.close();
      } catch (err) {
        console.error("[/api/chat] stream error:", err);
        try {
          controller.enqueue(
            sseChunk({ type: "error", message: "サーバーエラーが発生しました" })
          );
          controller.enqueue(sseDone());
        } finally {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
