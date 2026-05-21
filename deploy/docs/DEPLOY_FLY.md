# Deploy to Fly.io

Manifest: [`deploy/fly.toml`](../fly.toml)

## Prerequisites
- `flyctl` installed and `fly auth login`
- A managed Postgres (Neon/Supabase) connection string, or `fly postgres create`
- An S3-compatible bucket (see [STORAGE_PROVIDERS.md](./STORAGE_PROVIDERS.md))

## Initial setup
```bash
fly launch --no-deploy --copy-config --dockerfile deploy/Dockerfile
# Edit deploy/fly.toml: set `app` and `primary_region`.

fly secrets set \
  APP_URL=https://<app>.fly.dev \
  DATABASE_URL=postgres://... \
  BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  STORAGE_ENDPOINT=... STORAGE_REGION=... STORAGE_BUCKET=... \
  STORAGE_ACCESS_KEY=... STORAGE_SECRET_KEY=... STORAGE_FORCE_PATH_STYLE=false
```

## First deploy
```bash
fly deploy --config deploy/fly.toml
```
The `release_command` runs `node dist/scripts/migrate.js` before the new version
goes live.

## Subsequent deploys
`fly deploy` again, or push to `main` with `FLY_API_TOKEN` set as a repo secret
(see `.github/workflows/release.yml`).

## Rollback
```bash
fly releases            # find the version
fly deploy --image <previous-image-ref>   # or `fly releases rollback`
```

## Cost (rough)
- 100 MAU: 1 shared-cpu-1x / 512MB ≈ free–$5/mo + managed Postgres
- 1k MAU: same machine, maybe 2 for HA ≈ $5–15/mo + Postgres
- 10k MAU: 2–3 machines + larger Postgres ≈ $30–60/mo
