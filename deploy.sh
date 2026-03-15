#!/bin/bash
docker build --platform linux/amd64 -t asia-northeast1-docker.pkg.dev/project-fc876016-c843-4bee-96b/ai-chat-app/ai-friend-chat:latest . && \
docker push asia-northeast1-docker.pkg.dev/project-fc876016-c843-4bee-96b/ai-chat-app/ai-friend-chat:latest && \
gcloud run deploy ai-friend-chat \
  --image asia-northeast1-docker.pkg.dev/project-fc876016-c843-4bee-96b/ai-chat-app/ai-friend-chat:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances project-fc876016-c843-4bee-96b:asia-northeast1:ai-chat-db \
  --set-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest \
  --set-secrets GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest \
  --set-secrets GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest \
  --set-secrets NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest \
  --set-secrets DATABASE_URL=DATABASE_URL:latest \
  --set-env-vars NEXTAUTH_URL=https://PLACEHOLDER \
  --memory 512Mi
