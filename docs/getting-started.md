# 本地开发快速上手（占位）

## 先决条件
- Node.js ≥ 22（本地 23 亦可）
- pnpm ≥ 8.12
- Rust / Tauri
- Docker（Redis）

## 安装
pnpm install

## 启动依赖（Redis）
docker compose -f infra/docker/docker-compose.yml up -d redis

## 启动服务
pnpm --filter @cuemate/asr-gateway dev
pnpm --filter @cuemate/llm-router dev
pnpm --filter @cuemate/rag-service dev

## 启动前端
pnpm --filter @cuemate/web dev
pnpm --filter @cuemate/desktop tauri:dev

## 健康检查
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
