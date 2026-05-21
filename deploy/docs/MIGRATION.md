# Database migrations & moving between managed/self-hosted

## How migrations work here

- Schema lives in `libs/db/src/schema/*.ts` (Drizzle, Postgres dialect).
- `pnpm db:generate` writes SQL migration files to `libs/db/migrations/`.
  **Commit these.**
- The image copies `libs/db/migrations` to `/app/migrations`.
- Migrations are applied by a **separate one-shot step**, never on app startup:
  `node dist/scripts/migrate.js`. Each platform wires this up:
  - Fly: `release_command` in `fly.toml`
  - Railway / Render: `preDeployCommand`
  - Cloud Run: a Cloud Run **Job** run before traffic shifts
  - Compose: the `migrate` service in `docker-compose.selfhost.yml`
- Local dev can skip migration files and use `pnpm db:push` to sync the schema
  directly to a dev database.

## First-time setup (auth tables included)

Better Auth owns its own tables. Generate them into the schema, then create the
migration:

```bash
pnpm better-auth:generate          # writes libs/db/src/schema/auth.ts
# uncomment `export * from "./auth"` in libs/db/src/schema/index.ts
pnpm db:generate                   # emits SQL into libs/db/migrations
git add libs/db/src/schema/auth.ts libs/db/migrations
```

## Managed → self-hosted

The "no code change" property is the whole point of the S3 + Postgres adapters.

1. Bring up Postgres + MinIO via `deploy/docker-compose.selfhost.yml`.
2. `pg_dump` the managed Postgres and restore into the self-hosted one.
3. Copy bucket contents: `rclone copy r2:bucket minio:bucket`.
4. Update env vars (`DATABASE_URL`, `STORAGE_*`).
5. Deploy.

## Self-hosted → managed

Reverse of the above — same tools, opposite direction.
