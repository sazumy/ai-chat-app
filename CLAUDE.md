# AI友達チャットボット — プロジェクト仕様

## プロジェクト概要

日本語ユーザー向けの**AI友達チャットボット**。固定ペルソナを持つAIと雑談・日常会話を楽しめるエンターテイメントアプリ。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes / Server Actions |
| AI | Claude API (Anthropic) |
| 認証 | Google OAuth (NextAuth.js v5 / Auth.js) |
| データベース | PostgreSQL |
| ORM | Prisma |
| デプロイ | Google Cloud Run |
| コンテナ | Docker |
| 言語 | TypeScript |

## アーキテクチャ

```
[ブラウザ]
  └─ Next.js (Cloud Run)
       ├─ /app          ... UI (React Server Components + Client Components)
       ├─ /api/chat     ... Claude API へのストリーミングプロキシ
       ├─ /api/auth     ... NextAuth.js (Google OAuth)
       └─ /lib/db       ... Prisma + PostgreSQL (Cloud SQL)
```

## 主要機能

1. **ユーザー認証** — Google OAuth でサインイン／サインアウト
2. **会話履歴保持** — ログインユーザーの会話履歴を PostgreSQL に保存・復元
3. **雑談AI（固定ペルソナ）** — 1体の固定キャラクターと日本語で自然な会話
4. **ストリーミング応答** — Claude のレスポンスをリアルタイムに逐次表示

## AIペルソナ仕様

- **言語**: 日本語のみ
- **ペルソナ**: アプリ内で1体の固定キャラクター（名前・口調・性格はプロジェクト開始時に決定）
- **システムプロンプト**: `src/lib/ai/persona.ts` で一元管理
- **モデル**: `claude-opus-4-6` または `claude-sonnet-4-6`（コスト・品質のバランスで選択）
- **会話コンテキスト**: 直近 N ターン分の履歴を Claude に渡す（N は調整可）

## ディレクトリ構成（推奨）

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/          ... ログインページ
│   ├── chat/               ... メインチャット画面
│   ├── api/
│   │   ├── auth/[...nextauth]/  ... NextAuth.js ハンドラ
│   │   └── chat/           ... Claude API ストリーミングエンドポイント
│   └── layout.tsx
├── components/
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   └── InputBar.tsx
├── lib/
│   ├── ai/
│   │   ├── client.ts       ... Anthropic SDK インスタンス
│   │   └── persona.ts      ... システムプロンプト・ペルソナ定義
│   ├── auth.ts             ... NextAuth.js 設定
│   └── db/
│       └── prisma.ts       ... Prisma クライアント
└── prisma/
    └── schema.prisma       ... DB スキーマ
```

## データベーススキーマ（概要）

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  image     String?
  sessions  Session[]
  messages  Message[]
  createdAt DateTime  @default(now())
}

model Session {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id        String   @id @default(cuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

## 環境変数

```env
# Claude API
ANTHROPIC_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth.js
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Database
DATABASE_URL=  # PostgreSQL (Cloud SQL)
```

## Google Cloud 構成

- **Cloud Run**: コンテナイメージをデプロイ（`Dockerfile` を用意）
- **Cloud SQL**: PostgreSQL インスタンス（Cloud Run から Cloud SQL Connector で接続）
- **Secret Manager**: 環境変数は Secret Manager で管理し、Cloud Run に注入
- **Artifact Registry**: Docker イメージのレジストリ

## コーディング規約

- TypeScript strict モード有効
- コンポーネントは Server Components を基本とし、インタラクション部分のみ `"use client"`
- API Route は Edge Runtime 非推奨（Prisma との相性のため Node.js ランタイムを使用）
- エラーハンドリング: API Route では必ず `try/catch` して適切な HTTP ステータスを返す
- 会話履歴は Server Action または API Route 経由で取得・保存（クライアントから DB への直接アクセス禁止）

## 開発コマンド

**Makefile が用意されているので、以下の `make` コマンドを使うこと。** 直接 npm / gcloud コマンドを使うのではなく、必ず Makefile 経由で実行する。

| コマンド | 内容 |
|---|---|
| `make init` | `npm install` + `prisma generate` |
| `make migrate` | DBマイグレーション実行 |
| `make dev` | 開発サーバー起動（バックグラウンド） |
| `make stop` | 開発サーバー停止（ポート3000を終了） |
| `make build` | Next.js プロダクションビルド |
| `make docker-build` | Dockerイメージをローカルビルド |
| `make push` | DockerイメージをArtifact Registryへpush |
| `make deploy` | push済みイメージをCloud Runへデプロイ |
| `make release` | `push` + `deploy` を一括実行 |
| `make logs` | Cloud Runの最新ログを表示 |

```bash
# 参考: 直接実行する場合のコマンド（通常は make を使うこと）
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# DB マイグレーション
npx prisma migrate dev

# Prisma クライアント生成
npx prisma generate

# ビルド
npm run build

# Docker ビルド（本番）
docker build -t ai-friend-chat .

# Cloud Run へデプロイ
gcloud run deploy ai-friend-chat \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPO/ai-friend-chat \
  --region asia-northeast1 \
  --platform managed
```

## 今後の検討事項（スコープ外）

- 複数ペルソナへの拡張
- 音声入力／読み上げ
- 画像送受信
- RAG（ドキュメント参照）
- 多言語対応
