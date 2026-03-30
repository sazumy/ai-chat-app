"use client";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageData?: string | null;
  streaming?: boolean;
};

type Props = {
  message: Message;
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      {!isUser && (
        <div className="mr-2 flex-shrink-0 w-8 h-8 rounded-full bg-violet-400 flex items-center justify-center text-white text-sm font-bold">
          ハ
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-relaxed break-words ${
          isUser
            ? "bg-violet-500 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
        }`}
      >
        {message.imageData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageData}
            alt="添付画像"
            className="max-w-full rounded-lg mb-2 max-h-64 object-contain"
          />
        )}
        {message.content && (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
        {message.streaming && (
          <span className="inline-block w-0.5 h-4 bg-current ml-0.5 align-text-bottom animate-pulse" />
        )}
      </div>
    </div>
  );
}
