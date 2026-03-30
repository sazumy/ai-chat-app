"use client";

import { useRef, useEffect, KeyboardEvent, ChangeEvent, DragEvent, useState } from "react";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  selectedImage: string | null;
  onImageSelect: (dataUrl: string) => void;
  onImageClear: () => void;
};

export default function InputBar({
  value,
  onChange,
  onSend,
  disabled,
  selectedImage,
  onImageSelect,
  onImageClear,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // テキストエリアの高さを内容に合わせて自動調整
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // 画像がクリアされたらファイルインプットもリセット
  useEffect(() => {
    if (!selectedImage && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedImage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && (value.trim() || selectedImage)) {
        onSend();
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const processFile = (file: File) => {
    setError(null);

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("JPEG・PNG・GIF・WebP のみ対応しています");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("ファイルサイズは 5MB 以下にしてください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        onImageSelect(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const canSend = !disabled && (!!value.trim() || !!selectedImage);

  return (
    <div
      className={`border-t border-gray-200 bg-white transition ${
        isDragging ? "bg-violet-50 border-violet-300" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 画像プレビュー */}
      {selectedImage && (
        <div className="px-4 pt-3 flex items-start gap-2">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="添付プレビュー"
              className="h-20 w-auto rounded-lg border border-gray-200 object-contain"
            />
            <button
              onClick={onImageClear}
              aria-label="画像を削除"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-600 text-white flex items-center justify-center hover:bg-gray-800 transition text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <p className="px-4 pt-2 text-xs text-red-500">{error}</p>
      )}

      {/* ドラッグ中のヒント */}
      {isDragging && (
        <p className="px-4 pt-2 text-xs text-violet-500 font-medium">
          ここにドロップして画像を添付
        </p>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        {/* 画像添付ボタン */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="画像を添付"
          className="flex-shrink-0 w-9 h-9 rounded-full text-gray-400 flex items-center justify-center transition hover:text-violet-500 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(",")}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

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
          onClick={() => canSend && onSend()}
          disabled={!canSend}
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
    </div>
  );
}
