# Build stage
FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY services/rag-service/package.json services/rag-service/pnpm-lock.yaml* ./services/rag-service/
WORKDIR /app/services/rag-service
RUN pnpm install --frozen-lockfile
COPY services/rag-service ./
RUN pnpm build

# Production stage
FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm && apk add --no-cache dumb-init python3 py3-pip

COPY services/rag-service/package.json services/rag-service/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/services/rag-service/dist ./dist

RUN mkdir -p /app/chroma_data /app/documents && \
    addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



