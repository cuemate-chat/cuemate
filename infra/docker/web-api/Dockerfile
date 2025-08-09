FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY services/web-api/package.json services/web-api/pnpm-lock.yaml* ./services/web-api/
WORKDIR /app/services/web-api
RUN pnpm install --frozen-lockfile
COPY services/web-api ./
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
RUN npm install -g pnpm && apk add --no-cache dumb-init sqlite
COPY services/web-api/package.json services/web-api/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/services/web-api/dist ./dist
USER node
EXPOSE 3004
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]


