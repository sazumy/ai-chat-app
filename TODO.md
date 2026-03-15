# AI友達チャットボット — 実装 TODO

## 進め方

依存関係の順（インフラ → データ → 認証 → AI → UI → デプロイ）で進める。

---

## Step 1: プロジェクト初期化

- [x] **1-1** Next.js プロジェクト作成（TypeScript / App Router / Tailwind CSS / src ディレクトリ）
- [x] **1-2** 依存パッケージインストール
  - 本番: `@anthropic-ai/sdk`, `next-auth@beta`, `@auth/prisma-adapter`, `@prisma/client`, `prisma`
  - 開発: `@types/node`
- [x] **1-3** `tsconfig.json` の `strict: true` を確認
- [x] **1-4** ディレクトリ構造を作成（`src/lib/ai/`, `src/lib/db/`, `src/components/`）
- [x] **1-5** `.env.local` と `.env.example` を作成し、`.gitignore` に `.env*` を追加

---

## Step 2: DB スキーマ・Prisma セットアップ

- [x] **2-1** `prisma/schema.prisma` を作成
  - NextAuth.js 必須テーブル: `Account`, `VerificationToken`
  - アプリテーブル: `User`, `ChatSession`, `Message`
  - ※ `Session` 名は NextAuth と衝突するため `ChatSession` を使う
- [x] **2-2** `src/lib/db/prisma.ts` にシングルトン Prisma クライアントを実装
- [x] **2-3** ローカル開発用 PostgreSQL を `docker-compose.dev.yml` で構築
- [x] **2-4** `npx prisma migrate dev --name init` でマイグレーション実行
- [x] **2-5** `npx prisma generate` で Prisma クライアント生成

---

## Step 3: 認証（NextAuth.js v5 + Google OAuth）

- [x] **3-1** `src/lib/auth.ts` に NextAuth.js 設定を実装
  - Google Provider + PrismaAdapter 設定
  - `session.user.id` を返す `callbacks.session` を実装
- [x] **3-2** `src/app/api/auth/[...nextauth]/route.ts` に `handlers` をエクスポート
- [x] **3-3** `src/middleware.ts` でルート保護を実装（未認証 → `/login` リダイレクト）
- [x] **3-4** `src/types/next-auth.d.ts` で `Session` 型に `user.id` を追加
- [x] **3-5** Google Cloud Console でリダイレクト URI を登録
  - 開発: `http://localhost:3000/api/auth/callback/google`
  - 本番: `https://<Cloud Run URL>/api/auth/callback/google`

---

## Step 4: AI ペルソナ・Claude API 統合

- [x] **4-1** `src/lib/ai/client.ts` に Anthropic クライアントを実装（サーバーサイド専用）
- [x] **4-2** `src/lib/ai/persona.ts` にペルソナを定義
  - キャラクター名・口調・性格の設定
  - `SYSTEM_PROMPT`, `MODEL`（`claude-sonnet-4-6`）, `MAX_TOKENS`（1024）, `MAX_CONTEXT_TURNS`（20）を定数で管理

---

## Step 5: UI コンポーネント

- [x] **5-1** `src/components/MessageBubble.tsx` を実装
  - ユーザー／アシスタントで左右を切り替えるバブル UI
  - ストリーミング中のカーソルアニメーション
- [x] **5-2** `src/components/InputBar.tsx` を実装
  - Enter 送信 / Shift+Enter 改行
  - テキストエリアの高さ自動調整
  - 送信中の disabled 状態
- [x] **5-3** `src/components/ChatWindow.tsx` を実装（メインクライアントコンポーネント）
  - 初期メッセージ・セッション ID を props で受け取る
  - SSE ストリームを `ReadableStream` / `TextDecoder` で受信・逐次表示
  - メッセージ追加時の自動スクロール（`useRef`）
  - ローカル state でメッセージ配列を管理

---

## Step 6: API Routes

- [x] **6-1** `src/app/api/chat/route.ts` にストリーミングエンドポイントを実装
  - `export const runtime = 'nodejs'`（Prisma のため必須）
  - 認証チェック → ChatSession 取得/作成 → 履歴取得 → ユーザーメッセージ DB 保存
  - `anthropic.messages.stream()` でストリーミング開始
  - SSE 形式（`text/event-stream`）でチャンクを送信
  - ストリーム完了後にアシスタントメッセージを DB 保存
  - セッション ID を `{ type: 'session', sessionId }` で最初に送信
- [x] **6-2** `src/app/api/messages/route.ts` に履歴取得エンドポイントを実装
  - `GET /api/messages?sessionId=xxx`
  - 未指定の場合は最新セッションを返す

---

## Step 7: ページ実装

- [x] **7-1** `src/app/layout.tsx` を実装
  - SessionProvider でラップ
  - 日本語フォント（Noto Sans JP）設定
- [x] **7-2** `src/app/(auth)/login/page.tsx` を実装
  - Google サインインボタン
  - シンプルなカード型 UI
- [x] **7-3** `src/app/chat/page.tsx` を実装（Server Component）
  - `auth()` でユーザー取得
  - Prisma で最新 ChatSession と履歴を取得
  - `ChatWindow` に初期データを props として渡す
- [x] **7-4** ヘッダーにユーザー情報・ログアウトボタンを追加（`signOut` Server Action 使用）

---

## Step 8: Docker・デプロイ設定

- [x] **8-1** `next.config.ts` に `output: 'standalone'` を追加
- [x] **8-2** マルチステージ `Dockerfile` を作成
  - `deps` → `builder` → `runner` の3ステージ
  - `deps` ステージで `npx prisma generate` を実行
- [x] **8-3** `.dockerignore` を作成（`node_modules`, `.next`, `.env*` 等を除外）
- [x] **8-4** Artifact Registry リポジトリを作成
- [x] **8-5** Cloud SQL（PostgreSQL）インスタンスを作成
- [x] **8-6** Cloud Run サービスをデプロイ
  - `--add-cloudsql-instances` で Cloud SQL 接続を有効化
  - `--set-secrets` で Secret Manager からシークレットを注入
  - Service URL: `https://ai-friend-chat-871765195344.asia-northeast1.run.app`
  - ※ `src/lib/auth.ts` に `trustHost: true` を追加済み（UntrustedHost エラー対応）

---

## Step 9: 環境変数・Secret Manager 設定

- [x] **9-1** Secret Manager に各シークレットを登録
  - `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `NEXTAUTH_SECRET`（`openssl rand -base64 32` で生成）
  - `DATABASE_URL`（Cloud SQL Unix ソケット形式）
  - ⚠️ `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` が初期値プレースホルダーだったため実際の値に更新済み
  - ⚠️ `ANTHROPIC_API_KEY` / `NEXTAUTH_SECRET` も念のため確認推奨（`gcloud secrets versions access latest --secret=<NAME>`）
- [x] **9-2** Cloud Run サービスアカウントに `Secret Manager Secret Accessor` 権限を付与
- [x] **9-3** `NEXTAUTH_URL` をカスタムドメインまたは Cloud Run URL に設定
  - `https://ai-friend-chat-871765195344.asia-northeast1.run.app`
- [x] **9-4** Google Cloud Console の OAuth リダイレクト URI に本番 URL を追加
  - `http://localhost:3000/api/auth/callback/google`
  - `https://ai-friend-chat-871765195344.asia-northeast1.run.app/api/auth/callback/google`
  - 承認済み JavaScript 生成元も両方追加済み

---

## 注意事項・既知リスク

| リスク                          | 対処法                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| NextAuth.js v5 の API 変更      | 公式ドキュメント（auth.js.dev）を常に参照                     |
| Prisma と Edge Runtime の非互換 | API Route に `export const runtime = 'nodejs'` を必ず明示     |
| ストリーミング中のエラー        | `try/catch` でエラー時は DB 保存をスキップし SSE でエラー通知 |
| Cloud SQL 接続プール枯渇        | `DATABASE_URL` に `?connection_limit=1` を追加                |
| `Session` モデル名の衝突        | アプリ用チャットセッションは `ChatSession` という名前を使用   |

---

## 重要ファイル（実装の起点）

| ファイル                        | 役割                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `prisma/schema.prisma`          | 全テーブル定義の起点。最初に確定させる                       |
| `src/lib/auth.ts`               | NextAuth.js v5 の設定。セッション管理の中心                  |
| `src/lib/ai/persona.ts`         | AIキャラクターの一元管理。システムプロンプト・モデル選択     |
| `src/app/api/chat/route.ts`     | ストリーミング処理・DB保存・Claude API 統合の中核            |
| `src/components/ChatWindow.tsx` | SSE 受信・状態管理・UI更新のメインクライアントコンポーネント |
