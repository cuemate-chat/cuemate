FROM --platform=linux/amd64 node:22-bookworm-slim AS builder
WORKDIR /app

# 配置镜像源
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources

# 使用 cache mount 加速 apt 包下载
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y python3 make g++

# 配置 npm 镜像并安装 pnpm 9.15.9
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm@9.15.9 && \
    pnpm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --no-frozen-lockfile --filter @cuemate/config --filter @cuemate/i18n --filter @cuemate/logger --filter @cuemate/rag-service...

COPY services/rag-service ./services/rag-service
COPY packages/config ./packages/config
COPY packages/i18n ./packages/i18n
COPY packages/logger ./packages/logger
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/config --filter @cuemate/i18n --filter @cuemate/logger --filter @cuemate/rag-service build

FROM --platform=linux/amd64 node:22-bookworm-slim
WORKDIR /app

# 配置镜像源
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm@9.15.9 && \
    pnpm config set registry https://registry.npmmirror.com

# 使用 cache mount 加速 apt 包下载
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y dumb-init tzdata

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --prod --no-frozen-lockfile --filter @cuemate/config --filter @cuemate/i18n --filter @cuemate/logger --filter @cuemate/rag-service... && \
    find /app/node_modules/.pnpm/onnxruntime-node*/node_modules/onnxruntime-node/bin/napi-v3 \
    -type d \( -name "win32" -o -name "darwin" \) -exec rm -rf {} + 2>/dev/null || true && \
    find /app/node_modules/.pnpm/onnxruntime-node*/node_modules/onnxruntime-node/bin/napi-v3/linux/x64 \
    -type f -name "libonnxruntime_providers_cuda.so" -delete 2>/dev/null || true && \
    rm -rf /root/.local/share/pnpm /root/.npm /root/.cache

COPY --from=builder --chown=node:node /app/services/rag-service/dist ./services/rag-service/dist
COPY --from=builder --chown=node:node /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=node:node /app/packages/i18n/dist ./packages/i18n/dist
COPY --from=builder --chown=node:node /app/packages/logger/dist ./packages/logger/dist

WORKDIR /app/services/rag-service
RUN mkdir -p /opt/cuemate/logs/info/rag-service \
    && mkdir -p /opt/cuemate/logs/debug/rag-service \
    && mkdir -p /opt/cuemate/logs/warn/rag-service \
    && mkdir -p /opt/cuemate/logs/error/rag-service \
    && mkdir -p /opt/cuemate/models/fastembed \
    && chown -R node:node /opt/cuemate/logs \
    && chown -R node:node /opt/cuemate/models

ARG VERSION=v0.1.0
ENV VERSION=${VERSION}

USER node
EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
