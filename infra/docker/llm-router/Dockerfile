FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/llm-router/package.json ./services/llm-router/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --frozen-lockfile --filter @cuemate/logger --filter @cuemate/llm-router...
COPY services/llm-router ./services/llm-router
COPY packages/logger ./packages/logger
# tsc 需要根 tsconfig.base.json
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/logger --filter @cuemate/llm-router build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init tzdata && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/llm-router/package.json ./services/llm-router/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --prod --frozen-lockfile --filter @cuemate/logger --filter @cuemate/llm-router...
COPY --from=builder /app/services/llm-router/dist ./services/llm-router/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

WORKDIR /app/services/llm-router
# 预创建日志目录并授权给 node 用户
RUN mkdir -p /opt/cuemate/logs/info/llm-router \
    && mkdir -p /opt/cuemate/logs/debug/llm-router \
    && mkdir -p /opt/cuemate/logs/warn/llm-router \
    && mkdir -p /opt/cuemate/logs/error/llm-router \
    && chown -R node:node /opt/cuemate/logs

# 设置版本环境变量
ARG VERSION=v0.1.0
ENV VERSION=${VERSION}

USER node
EXPOSE 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



