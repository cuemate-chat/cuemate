FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/llm-router/package.json ./services/llm-router/package.json
RUN pnpm install --frozen-lockfile --filter @cuemate/llm-router...
COPY services/llm-router ./services/llm-router
# tsc 需要根 tsconfig.base.json
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm -r --filter @cuemate/llm-router build

FROM node:22-bookworm-slim
WORKDIR /app
RUN npm install -g pnpm && apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpmfile.cjs ./
COPY services/llm-router/package.json ./services/llm-router/package.json
RUN pnpm install --prod --frozen-lockfile --filter @cuemate/llm-router...
COPY --from=builder /app/services/llm-router/dist ./services/llm-router/dist

WORKDIR /app/services/llm-router
USER node
EXPOSE 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



