# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10

# Workspace manifests (warstwa cache — zmienia się rzadko)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instaluj wszystkie zależności (pnpm-workspace.yaml zawiera ignoredBuiltDependencies
# dla native modules — tu akceptujemy, budujemy je explicite w stage 2)
RUN pnpm install --frozen-lockfile

# Wygeneruj Prisma client przed buildem
COPY backend/prisma ./backend/prisma
RUN ./node_modules/.bin/prisma generate --schema=backend/prisma/schema.prisma

# Skopiuj źródła i zbuilduj backend
COPY . .
RUN pnpm nx build backend

# Skopiuj schemat i migracje do artefaktu
RUN cp -r backend/prisma dist/backend/prisma

# ─── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:24-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

# package.json wygenerowany przez nx generatePackageJson (tylko prod deps)
COPY --from=builder /app/dist/backend/package.json ./package.json

# Schemat Prisma musi być przed pnpm install — @prisma/client uruchamia
# prisma generate w postinstall i szuka go w ./prisma/schema.prisma
COPY --from=builder /app/dist/backend/prisma ./prisma

# Instaluj prod deps + pakiety nieujęte przez Nx generatePackageJson:
# - prisma: CLI do migracji w docker-entrypoint.sh
# - tslib: runtime helper TypeScript (importHelpers:true w tsconfig.base.json)
RUN pnpm install --prod --no-frozen-lockfile && \
    pnpm add prisma@5.22.0 tslib@2 tsx && \
    ./node_modules/.bin/prisma generate --schema ./prisma/schema.prisma

# Zbudowana aplikacja
COPY --from=builder /app/dist/backend/main.js ./main.js

# Entrypoint: migracje + start
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
