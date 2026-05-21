# Deploy to Google Cloud Run

Manifest: [`deploy/cloudrun.service.yaml`](../cloudrun.service.yaml)

## Prerequisites
- `gcloud` CLI, authenticated, with a project set
- Cloud SQL (Postgres) or external managed Postgres
- An S3-compatible bucket (R2/B2/S3)
- Image pushed to a registry (the release workflow pushes to GHCR)

## Initial setup
1. Create a Secret Manager secret per env var, grouped under one name the
   manifest references — `comfort-stack-secrets` with keys `APP_URL`,
   `DATABASE_URL`, `BETTER_AUTH_SECRET`, `STORAGE_*`, etc.
2. Edit `cloudrun.service.yaml`: replace `ghcr.io/OWNER/...` with your image.
3. Create the migration **Job** (runs the same image with a command override):
   ```bash
   gcloud run jobs create comfort-stack-migrate \
     --image ghcr.io/OWNER/comfort-stack:latest \
     --region asia-southeast1 \
     --command node --args dist/scripts/migrate.js \
     --set-secrets DATABASE_URL=comfort-stack-secrets:DATABASE_URL
   ```

## First deploy
```bash
gcloud run jobs execute comfort-stack-migrate --region asia-southeast1 --wait
gcloud run services replace deploy/cloudrun.service.yaml --region asia-southeast1
```
Run the migration Job **before** replacing the service. Never migrate inside the
service container.

## Subsequent deploys
Push to `main` with `GCP_SA_KEY` (and optional `GCP_REGION`) set as repo secrets;
`.github/workflows/release.yml` runs the Job then `services replace`.

## Rollback
```bash
gcloud run revisions list --service comfort-stack --region asia-southeast1
gcloud run services update-traffic comfort-stack \
  --to-revisions <previous-revision>=100 --region asia-southeast1
```

## Notes & cost
- `minScale: "1"` keeps one warm instance (no cold starts). Set `"0"` for
  scale-to-zero — cheaper but cold starts, and fine because Postgres is external.
- 100 MAU: scale-to-zero ≈ a few $/mo + Cloud SQL (the Postgres dominates)
- 1k–10k MAU: ≈ $10–40/mo compute + Cloud SQL tier
