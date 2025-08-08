# Build stage
FROM node:23-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY services/llm-router/package.json services/llm-router/pnpm-lock.yaml* ./services/llm-router/
WORKDIR /app/services/llm-router
RUN pnpm install --frozen-lockfile
COPY services/llm-router ./
RUN pnpm build

# Production stage
FROM node:23-alpine
WORKDIR /app
RUN npm install -g pnpm && apk add --no-cache dumb-init

COPY services/llm-router/package.json services/llm-router/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/services/llm-router/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3002
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



