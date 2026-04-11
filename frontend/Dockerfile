# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:24-slim AS builder

ARG BUILD_CONFIGURATION=production
ARG FRONTEND_VERSION=unknown

ENV FRONTEND_VERSION=${FRONTEND_VERSION}

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build frontend --configuration=$BUILD_CONFIGURATION

# ─── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# nginx.conf jako szablon — ${BACKEND_URL} zostanie podstawiony przez entrypoint
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf.template

# Entrypoint: envsubst + start nginx
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
