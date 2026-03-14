import Anthropic from "@anthropic-ai/sdk";

// サーバーサイド専用 — クライアントバンドルに含めないこと
if (typeof window !== "undefined") {
  throw new Error("Anthropic client must only be used on the server side.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
