FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

# 使用根锁文件安装，仅过滤 asr-gateway
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/asr-gateway/package.json ./services/asr-gateway/package.json
RUN pnpm install --frozen-lockfile --filter @cuemate/asr-gateway...

# 复制源码并构建
COPY services/asr-gateway ./services/asr-gateway
# tsc 需要根 tsconfig.base.json
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/asr-gateway build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# 使用根锁文件执行按包生产安装，确保运行时依赖完整
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/asr-gateway/package.json ./services/asr-gateway/package.json
RUN pnpm install --prod --frozen-lockfile --filter @cuemate/asr-gateway...

# 复制构建产物
COPY --from=builder /app/services/asr-gateway/dist ./services/asr-gateway/dist

WORKDIR /app/services/asr-gateway
USER node
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



