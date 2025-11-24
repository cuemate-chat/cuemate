FROM node:20-bookworm-slim AS builder
WORKDIR /app

# 配置 Debian 镜像源（清华大学）
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|security.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && \
    npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

# 使用 cache mount 加速 apt 包下载
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y python3 make g++

# 限制编译并发数，减少内存占用
ENV MAKEFLAGS="-j1"
ENV npm_config_jobs="1"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/web-api/package.json ./services/web-api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/data-sqlite/package.json ./packages/data-sqlite/package.json
COPY packages/logger/package.json ./packages/logger/package.json
ENV INSTALL_FULL_OPTIONALS=true
RUN pnpm install --no-frozen-lockfile --filter @cuemate/config --filter @cuemate/logger --filter @cuemate/data-sqlite --filter @cuemate/web-api...

COPY services/web-api ./services/web-api
COPY packages/config ./packages/config
COPY packages/data-sqlite ./packages/data-sqlite
COPY packages/logger ./packages/logger
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/config --filter @cuemate/logger --filter @cuemate/data-sqlite --filter @cuemate/web-api build

FROM node:20-bookworm-slim
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
    apt-get update && apt-get install -y dumb-init sqlite3 python3 make g++ tzdata

# 限制编译并发数
ENV MAKEFLAGS="-j1"
ENV npm_config_jobs="1"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/web-api/package.json ./services/web-api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/data-sqlite/package.json ./packages/data-sqlite/package.json
COPY packages/logger/package.json ./packages/logger/package.json
ENV INSTALL_FULL_OPTIONALS=true
RUN pnpm install --prod --no-frozen-lockfile --filter @cuemate/config --filter @cuemate/logger --filter @cuemate/data-sqlite --filter @cuemate/web-api... && \
    rm -rf /root/.local/share/pnpm /root/.npm /root/.cache

COPY --from=builder /app/services/web-api/dist ./services/web-api/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/data-sqlite/dist ./packages/data-sqlite/dist
COPY --from=builder /app/packages/logger/dist ./packages/logger/dist

WORKDIR /app/services/web-api
RUN mkdir -p /opt/cuemate/logs/info/web-api \
    && mkdir -p /opt/cuemate/logs/debug/web-api \
    && mkdir -p /opt/cuemate/logs/warn/web-api \
    && mkdir -p /opt/cuemate/logs/error/web-api \
    && mkdir -p /opt/cuemate/pdf \
    && chown -R node:node /opt/cuemate/logs \
    && chown -R node:node /opt/cuemate/pdf

ARG VERSION=v0.1.0
ENV VERSION=${VERSION}

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
