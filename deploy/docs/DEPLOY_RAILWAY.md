# Deploy to Railway

Manifest: [`deploy/railway.json`](../railway.json)

## Prerequisites
- A Railway account and project
- (Optional) the Railway CLI: `npm i -g @railway/cli && railway login`

## Initial setup
1. Create a new service from your GitHub repo.
2. Settings → Config: point the config path at `deploy/railway.json` (it sets the
   Dockerfile, start command, health check, and `preDeployCommand`).
3. Add a Postgres plugin (or use external managed Postgres).
4. Variables → add everything from [`deploy/.env.example`](../.env.example):
   `APP_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STORAGE_*`, etc. Railway
   exposes the Postgres plugin URL as `DATABASE_URL` automatically if you
   reference it.

## First deploy
Trigger a deploy (push to the connected branch, or `railway up`). The
`preDeployCommand` runs `node dist/scripts/migrate.js` before the new release.

## Subsequent deploys
Push to the connected branch.

## Rollback
Railway dashboard → Deployments → pick a previous deployment → "Redeploy".

## Cost (rough)
- 100 MAU: hobby plan ≈ $5/mo incl. small Postgres
- 1k MAU: ≈ $10–20/mo
- 10k MAU: ≈ $40–80/mo depending on Postgres size
