FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

# 复制工作区元数据和需要的 package.json 以使用根锁文件安装
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json

# 安装依赖（仅 rag-service 作用域）
RUN pnpm install --frozen-lockfile --filter @cuemate/rag-service...

# 复制源码并构建
COPY services/rag-service ./services/rag-service
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/rag-service build || pnpm -r --filter @cuemate/rag-service build --force

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# 使用工作区锁文件执行按包生产安装，确保运行时依赖完整
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
RUN pnpm install --prod --frozen-lockfile --filter @cuemate/rag-service...

# 复制构建产物
COPY --from=builder /app/services/rag-service/dist ./services/rag-service/dist

WORKDIR /app/services/rag-service
USER node
EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



