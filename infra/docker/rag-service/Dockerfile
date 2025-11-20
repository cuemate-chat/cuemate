FROM node:22-bookworm-slim AS builder
WORKDIR /app

# 配置镜像源
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources

# 使用 cache mount 加速 apt 包下载
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y python3 make g++

# 配置 npm 镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --include=optional --filter @cuemate/logger --filter @cuemate/rag-service...

COPY services/rag-service ./services/rag-service
COPY packages/logger ./packages/logger
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/logger --filter @cuemate/rag-service build

FROM node:22-bookworm-slim
WORKDIR /app

# 配置镜像源
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

# 使用 cache mount 加速 apt 包下载
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y dumb-init tzdata

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/rag-service/package.json ./services/rag-service/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN pnpm install --prod --include=optional --filter @cuemate/logger --filter @cuemate/rag-service...

COPY --from=builder /app/services/rag-service/dist ./services/rag-service/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

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
