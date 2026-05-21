# Deploy to Render

Manifest: [`deploy/render.yaml`](../render.yaml)

## Prerequisites
- A Render account
- A Postgres instance (Render Postgres or external managed)
- An S3-compatible bucket

## Initial setup
1. New → Blueprint, point at the repo. Render reads `deploy/render.yaml`.
   (Or: New → Web Service, runtime Docker, Dockerfile `./deploy/Dockerfile`,
   context `.`.)
2. Set the `sync: false` env vars in the dashboard — they are intentionally not
   committed: `APP_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STORAGE_*`, etc.
   See [`deploy/.env.example`](../.env.example).

## First deploy
Render builds the image and runs `preDeployCommand`
(`node dist/scripts/migrate.js`) before routing traffic. Health checks hit
`/healthz`.

## Subsequent deploys
Auto-deploys on push to the connected branch (toggle in settings).

## Rollback
Dashboard → the service → "Manual Deploy" → "Deploy a previous commit", or
"Rollback" on a prior deploy.

## Cost (rough)
- 100 MAU: Starter web ($7/mo) + Starter Postgres ($7/mo) ≈ $14/mo
- 1k MAU: same tier ≈ $14–25/mo
- 10k MAU: Standard instances ≈ $50–100/mo
