FROM node:22-bookworm-slim AS builder
WORKDIR /app

# 配置 npm/pnpm 镜像源
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/llm-router/package.json ./services/llm-router/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --no-frozen-lockfile --filter @cuemate/logger --filter @cuemate/llm-router...
COPY services/llm-router ./services/llm-router
COPY packages/logger ./packages/logger
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/logger --filter @cuemate/llm-router build

FROM node:22-bookworm-slim
WORKDIR /app

# 配置 npm/pnpm 镜像源
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

# 使用 cache mount 加速 apt 包下载
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y dumb-init tzdata

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/llm-router/package.json ./services/llm-router/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --prod --no-frozen-lockfile --filter @cuemate/logger --filter @cuemate/llm-router... && \
    rm -rf /root/.local/share/pnpm /root/.npm /root/.cache

COPY --from=builder /app/services/llm-router/dist ./services/llm-router/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

WORKDIR /app/services/llm-router
RUN mkdir -p /opt/cuemate/logs/info/llm-router \
    && mkdir -p /opt/cuemate/logs/debug/llm-router \
    && mkdir -p /opt/cuemate/logs/warn/llm-router \
    && mkdir -p /opt/cuemate/logs/error/llm-router \
    && chown -R node:node /opt/cuemate/logs

ARG VERSION=v0.1.0
ENV VERSION=${VERSION}

USER node
EXPOSE 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
