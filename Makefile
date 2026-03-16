# ─── 設定 ────────────────────────────────────────────────────────────────────
PROJECT_ID   := project-fc876016-c843-4bee-96b
REGION       := asia-northeast1
REPO         := ai-chat-app
IMAGE_NAME   := ai-friend-chat
IMAGE        := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(REPO)/$(IMAGE_NAME)

.PHONY: init dev build docker-build deploy stop logs

# ─── 初期化 ──────────────────────────────────────────────────────────────────
## 依存関係インストール・Prismaクライアント生成
init:
	npm install
	npx prisma generate

## DBマイグレーション実行
migrate:
	npx prisma migrate dev

# ─── 開発 ────────────────────────────────────────────────────────────────────
## 開発サーバー起動（バックグラウンド）
dev:
	npm run dev &

## 開発サーバー停止
stop:
	@PID=$$(lsof -ti :3000); \
	if [ -n "$$PID" ]; then \
		kill $$PID && echo "開発サーバー (PID: $$PID) を停止しました"; \
	else \
		echo "開発サーバーは起動していません"; \
	fi

# ─── ビルド ───────────────────────────────────────────────────────────────────
## Next.js プロダクションビルド
build:
	npm run build

## Docker イメージビルド（ローカル確認用）
docker-build:
	docker build -t $(IMAGE_NAME) .

# ─── デプロイ ─────────────────────────────────────────────────────────────────
## Docker イメージをビルドして Artifact Registry へ push
push:
	docker build -t $(IMAGE) .
	docker push $(IMAGE)

## Cloud Run へデプロイ（push 済みイメージを使用）
deploy:
	gcloud run deploy $(IMAGE_NAME) \
		--image $(IMAGE) \
		--region $(REGION) \
		--platform managed \
		--project $(PROJECT_ID)

## ビルド・push・デプロイを一括実行
release: push deploy

# ─── その他 ───────────────────────────────────────────────────────────────────
## Cloud Run の最新ログを表示
logs:
	gcloud run services logs read $(IMAGE_NAME) \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--limit 50
