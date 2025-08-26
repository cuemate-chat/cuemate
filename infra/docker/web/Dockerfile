FROM node:20-bookworm-slim AS builder
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制根工作区元数据和 web 包元数据，仅安装 web 所需依赖
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --no-frozen-lockfile --filter @cuemate/web...

# 复制源码并构建（支持通过构建参数注入后端地址）
ARG WEB_API_BASE=http://localhost:3001
ENV VITE_WEB_API_BASE=${WEB_API_BASE}
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/web ./apps/web
RUN pnpm --filter @cuemate/web build

# --- Runtime ---
FROM nginx:alpine

# 拷贝构建产物
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# 覆盖默认站点，支持 SPA 路由回退
COPY infra/docker/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


