# Build stage
FROM node:23-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy only service workspace
COPY services/asr-gateway/package.json services/asr-gateway/pnpm-lock.yaml* ./services/asr-gateway/

WORKDIR /app/services/asr-gateway

RUN pnpm install --frozen-lockfile

# Copy source
COPY services/asr-gateway ./

RUN pnpm build

# Production stage
FROM node:23-alpine

WORKDIR /app
RUN npm install -g pnpm && apk add --no-cache dumb-init

COPY services/asr-gateway/package.json services/asr-gateway/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/services/asr-gateway/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]



