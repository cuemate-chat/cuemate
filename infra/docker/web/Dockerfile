FROM node:20-bookworm-slim AS builder
WORKDIR /app

# 配置 npm 和 pnpm 使用淘宝镜像
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com

# 复制根工作区元数据和 web 包元数据，仅安装 web 所需依赖
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/config/package.json ./packages/config/package.json
RUN pnpm install --no-frozen-lockfile --filter @cuemate/config --filter @cuemate/web...

# 复制源码并构建（支持通过构建参数注入后端地址）
ARG WEB_API_BASE=http://localhost:3001
ENV VITE_WEB_API_BASE=${WEB_API_BASE}
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/config ./packages/config
COPY apps/web ./apps/web
RUN pnpm --filter @cuemate/config --filter @cuemate/web build

# --- Runtime ---
FROM nginx:alpine

# 设置版本环境变量
ARG VERSION=v0.1.0
ENV VERSION=${VERSION}

# 拷贝构建产物
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# 覆盖默认站点，支持 SPA 路由回退
COPY infra/docker/web/nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝启动脚本
COPY infra/docker/web/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/bin/sh", "/start.sh"]
