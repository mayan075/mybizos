FROM node:20-slim

RUN npm i -g pnpm@9

WORKDIR /app

# Copy entire monorepo (Railway builds from root)
COPY . .

# Install all dependencies from root
RUN pnpm install --frozen-lockfile || pnpm install

# Build packages that the API depends on
RUN pnpm --filter @mybizos/shared build 2>/dev/null || true
RUN pnpm --filter @mybizos/db build 2>/dev/null || true
RUN pnpm --filter @mybizos/ai build 2>/dev/null || true
RUN pnpm --filter @mybizos/email build 2>/dev/null || true
RUN pnpm --filter @mybizos/integrations build 2>/dev/null || true

WORKDIR /app/apps/api

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/index.ts"]
