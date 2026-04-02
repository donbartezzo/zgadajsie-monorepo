# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:24-slim AS builder

ARG BUILD_CONFIGURATION=dev

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build frontend --configuration=$BUILD_CONFIGURATION

# ─── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
