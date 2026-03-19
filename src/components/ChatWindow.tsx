"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble, { Message } from "./MessageBubble";
import InputBar from "./InputBar";
import { PERSONA_NAME } from "@/lib/ai/persona";

type Props = {
  initialMessages: Message[];
  initialSessionId: string | null;
};

export default function ChatWindow({
  initialMessages,
  initialSessionId,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "welcome",
            role: "assistant",
            content: `やあ！ ${PERSONA_NAME} だよ。何でも話しかけてね！`,
          },
        ]
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !selectedImage) || isStreaming) return;

    const imageData = selectedImage;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      imageData,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();

    // ストリーミング中のプレースホルダーを追加
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, imageData }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "session" && parsed.sessionId) {
              setSessionId(parsed.sessionId);
            } else if (parsed.type === "delta" && parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulated, streaming: true }
                    : m
                )
              );
            }
          } catch {
            // JSON パースエラーは無視
          }
        }
      }

      // ストリーミング完了 — カーソルを消す
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: "エラーが発生したよ。もう一度試してみてね。",
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力バー */}
      <InputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isStreaming}
        selectedImage={selectedImage}
        onImageSelect={setSelectedImage}
        onImageClear={() => setSelectedImage(null)}
      />
    </div>
  );
}
