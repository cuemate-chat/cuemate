FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

# 复制工作区元数据与所需包的 package.json 以最大化缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/web-api/package.json ./services/web-api/package.json
COPY packages/data-sqlite/package.json ./packages/data-sqlite/package.json

# 安装仅 web-api 及其依赖（含 data-sqlite）
RUN pnpm install --frozen-lockfile --filter @cuemate/web-api... --filter @cuemate/data-sqlite...

# 复制源码并构建
COPY services/web-api ./services/web-api
COPY packages/data-sqlite ./packages/data-sqlite
RUN pnpm -r --filter @cuemate/web-api build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init sqlite3 && rm -rf /var/lib/apt/lists/*

# 拷贝运行所需产物与依赖
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/web-api/package.json ./services/web-api/package.json
COPY --from=builder /app/services/web-api/dist ./services/web-api/dist
COPY --from=builder /app/packages/data-sqlite/package.json ./packages/data-sqlite/package.json
COPY --from=builder /app/packages/data-sqlite/dist ./packages/data-sqlite/dist

WORKDIR /app/services/web-api
USER node
EXPOSE 3004
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]


