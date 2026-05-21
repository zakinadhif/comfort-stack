# Single portable image: builds the Astro landing, the React SPA, and the Hono
# API, then serves all three from one Node process. Build context is the repo
# root:  docker build -f deploy/Dockerfile -t comfort-stack .

# ---- deps ----
FROM node:22-alpine AS deps
# https://github.com/nodejs/docker-node — why libc6-compat is sometimes needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

# Copy only manifests first for a cacheable install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/app/package.json apps/app/
COPY apps/landing/package.json apps/landing/
COPY libs/api-client-react/package.json libs/api-client-react/
COPY libs/api-spec/package.json libs/api-spec/
COPY libs/api-zod/package.json libs/api-zod/
COPY libs/auth/package.json libs/auth/
COPY libs/config/package.json libs/config/
COPY libs/db/package.json libs/db/
COPY libs/storage/package.json libs/storage/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
# Generate the typed client + Zod validators (the SPA imports them).
RUN pnpm codegen
RUN pnpm --filter landing build
RUN pnpm --filter app build
RUN pnpm --filter api build
# Prune to API + its production deps only. --legacy: workspace packages are
# bundled into the API by tsup, so we just need the external deps copied
# (pnpm v10 otherwise requires inject-workspace-packages).
RUN pnpm --filter api deploy --prod --legacy /prod/api

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

# Pruned production node_modules (from pnpm deploy) + the built API bundle.
# dist is copied separately because it's gitignored and pnpm deploy omits it.
COPY --from=build /prod/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
# Static frontends served by Hono: Astro at /, React SPA at /app/*.
COPY --from=build /app/apps/landing/dist ./public/landing
COPY --from=build /app/apps/app/dist ./public/spa
# SQL migrations, run by the separate migrate step (node dist/scripts/migrate.js).
COPY --from=build /app/libs/db/migrations ./migrations

EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:8080/healthz || exit 1
CMD ["node", "dist/index.js"]
