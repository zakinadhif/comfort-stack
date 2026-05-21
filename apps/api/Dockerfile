FROM node:22-alpine AS builder

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy package descriptors
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY libs/db/package.json ./libs/db/
COPY libs/auth/package.json ./libs/auth/
COPY libs/storage/package.json ./libs/storage/
COPY libs/api-zod/package.json ./libs/api-zod/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source
COPY . .

# Build API (bundles local workspace packages)
RUN pnpm --filter api run build

# Deploy prod dependencies (only for API)
RUN pnpm --filter api deploy --prod /app/out

# Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy prod dependencies and bundled output
COPY --from=builder /app/out/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# You can override this at runtime or via volume
ENV DATABASE_URL /app/data/production.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
