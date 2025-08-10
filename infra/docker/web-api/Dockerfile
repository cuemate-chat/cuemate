FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/web-api/package.json ./services/web-api/package.json
COPY packages/data-sqlite/package.json ./packages/data-sqlite/package.json
ENV INSTALL_FULL_OPTIONALS=true
RUN pnpm install --no-frozen-lockfile --filter @cuemate/web-api... --filter @cuemate/data-sqlite...

COPY services/web-api ./services/web-api
COPY packages/data-sqlite ./packages/data-sqlite
# tsc 需要根 tsconfig.base.json
COPY tsconfig.base.json ./tsconfig.base.json
# 先构建被依赖包再构建 web-api
RUN pnpm -r --filter @cuemate/data-sqlite --filter @cuemate/web-api build

FROM node:20-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init sqlite3 python3 make g++ && rm -rf /var/lib/apt/lists/*

# 使用根锁文件按包生产安装，确保运行时依赖完整
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/web-api/package.json ./services/web-api/package.json
COPY packages/data-sqlite/package.json ./packages/data-sqlite/package.json
ENV INSTALL_FULL_OPTIONALS=true
RUN pnpm install --prod --no-frozen-lockfile --filter @cuemate/web-api... --filter @cuemate/data-sqlite...

COPY --from=builder /app/services/web-api/dist ./services/web-api/dist
COPY --from=builder /app/packages/data-sqlite/dist ./packages/data-sqlite/dist

WORKDIR /app/services/web-api
USER node
EXPOSE 3004
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]


