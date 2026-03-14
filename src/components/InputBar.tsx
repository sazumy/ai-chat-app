"use client";

import { useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
};

export default function InputBar({ value, onChange, onSend, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを内容に合わせて自動調整
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="メッセージを入力…（Shift+Enter で改行）"
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-violet-400 focus:bg-white disabled:opacity-50"
      />
      <button
        onClick={() => !disabled && value.trim() && onSend()}
        disabled={disabled || !value.trim()}
        aria-label="送信"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-violet-500 text-white flex items-center justify-center transition hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 translate-x-0.5 -translate-y-0.5 rotate-45"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </div>
  );
}
