FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

# 复制工作区元数据和需要的 package.json 以使用根锁文件安装
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
COPY packages/logger/package.json ./packages/logger/package.json

# 安装依赖（仅 rag-service 作用域）
RUN pnpm install --no-frozen-lockfile --filter @cuemate/logger --filter @cuemate/rag-service...

# 复制源码并构建
COPY services/rag-service ./services/rag-service
COPY packages/logger ./packages/logger
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/logger --filter @cuemate/rag-service build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# 使用工作区锁文件执行按包生产安装，确保运行时依赖完整
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --prod --no-frozen-lockfile --filter @cuemate/logger --filter @cuemate/rag-service...

# 复制构建产物
COPY --from=builder /app/services/rag-service/dist ./services/rag-service/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

WORKDIR /app/services/rag-service
# 预创建日志目录并授权给 node 用户
RUN mkdir -p /opt/cuemate/log/info/rag-service \
    && mkdir -p /opt/cuemate/log/debug/rag-service \
    && mkdir -p /opt/cuemate/log/warn/rag-service \
    && mkdir -p /opt/cuemate/log/error/rag-service \
    && chown -R node:node /opt/cuemate/log
USER node
EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



