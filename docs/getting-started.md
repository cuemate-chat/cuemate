# 本地开发快速上手

## 先决条件
- Node.js ≥ 18
- pnpm ≥ 8.0
- Docker & Docker Compose
- Rust & Tauri (桌面应用开发)

## 安装
```bash
pnpm install
```

## 启动后端服务 (Docker)
```bash
# 启动所有服务
docker compose -f infra/docker/docker-compose.yml up -d

# 或仅启动特定服务
docker compose -f infra/docker/docker-compose.yml up -d web-api llm-router rag-service cuemate-asr
```

## 启动开发服务
```bash
# Web API 服务
pnpm --filter @cuemate/web-api dev

# LLM 路由服务  
pnpm --filter @cuemate/llm-router dev

# RAG 知识库服务
pnpm --filter @cuemate/rag-service dev
```

## 启动前端
```bash
# Web 前端
pnpm --filter @cuemate/web dev

# 桌面应用
pnpm --filter @cuemate/desktop tauri:dev
```

## 健康检查
```bash
# 后端服务
curl http://localhost:3001/health    # Web API
curl http://localhost:3002/health    # LLM Router
curl http://localhost:3003/health    # RAG Service

# ASR 服务
curl http://localhost:10095/        # CueMate ASR (FunASR)
```

## WebSocket 连接测试
```bash
# 语音识别服务服务
ws://localhost:10095/asr
```
