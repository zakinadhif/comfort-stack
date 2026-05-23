# Deploy to AWS App Runner

Manifest: [`deploy/apprunner.json`](../apprunner.json)

App Runner is the closest AWS analog to Cloud Run / Fly / Railway / Render —
managed containers, built-in autoscaling, HTTPS endpoint, no VPC or load
balancer to wire up. The image must live in **ECR** (App Runner does not pull
from GHCR), so the release workflow mirrors the GHCR image into ECR before
calling App Runner.

## Prerequisites
- `aws` CLI, authenticated to the target account/region
- An ECR repo: `aws ecr create-repository --repository-name comfort-stack`
- A managed Postgres (RDS, Neon, Supabase) reachable from App Runner
- An S3 bucket (App Runner can use the same AWS account's S3 via IAM, or any
  S3-compatible provider via `STORAGE_*`)
- Two IAM roles (one-time setup):
  - `AppRunnerECRAccessRole` — trust principal `build.apprunner.amazonaws.com`,
    policy `AWSAppRunnerServicePolicyForECRAccess`. Used to pull the image.
  - `AppRunnerInstanceRole` — trust principal `tasks.apprunner.amazonaws.com`,
    policy granting `secretsmanager:GetSecretValue` on the
    `comfort-stack/*` secrets (and S3 access if you use SDK-default credentials
    for storage instead of `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY`).

## Initial setup
1. Create one Secrets Manager secret per env var, named `comfort-stack/<NAME>`
   (e.g. `comfort-stack/DATABASE_URL`). The manifest references them by ARN.
2. Edit `deploy/apprunner.json`: replace every `ACCOUNT_ID` and `REGION`
   placeholder with your values. The `ImageIdentifier` must point at your ECR
   repo.
3. Build and push the image to ECR (the release workflow does this for you):
   ```bash
   aws ecr get-login-password --region "$REGION" \
     | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
   docker buildx build --platform linux/amd64 \
     -f deploy/Dockerfile \
     -t "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/comfort-stack:latest" \
     --push .
   ```

## First deploy
Run the migration once against your production database, then create the
service:
```bash
# Migrate (run from anywhere with DATABASE_URL set — production credentials)
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/comfort-stack:latest" \
  node dist/scripts/migrate.js

# Create the App Runner service
aws apprunner create-service \
  --region "$REGION" \
  --cli-input-json file://deploy/apprunner.json
```
Run migrations **before** the service update. Never run them inside the App
Runner container — App Runner has no pre-deploy hook and migrations would race
across replicas.

## Subsequent deploys
Push to `main` with `AWS_ROLE_TO_ASSUME` (OIDC) and `AWS_REGION` set as repo
secrets, plus `APP_RUNNER_SERVICE_ARN`. `.github/workflows/release.yml` will:
1. mirror the GHCR image into ECR,
2. run `node dist/scripts/migrate.js` via `docker run` against the production
   `DATABASE_URL`,
3. call `aws apprunner start-deployment` to roll the service forward.

Or manually:
```bash
aws apprunner start-deployment \
  --region "$REGION" \
  --service-arn "$APP_RUNNER_SERVICE_ARN"
```

## Rollback
App Runner does not retain prior revisions you can flip back to. To roll back,
re-tag the previous image as `:latest` in ECR and trigger a new deployment:
```bash
aws ecr batch-get-image \
  --repository-name comfort-stack \
  --image-ids imageTag=sha-<previous> \
  --query 'images[0].imageManifest' --output text \
  | aws ecr put-image \
      --repository-name comfort-stack \
      --image-tag latest \
      --image-manifest file:///dev/stdin
aws apprunner start-deployment --service-arn "$APP_RUNNER_SERVICE_ARN"
```

## Notes & cost
- Min instances default to 1 (no scale-to-zero on App Runner — there is a
  "paused" mode you can toggle, but that is not request-driven). Set `Cpu` /
  `Memory` in the manifest (`512`/`1024`, `1024`/`2048`, `2048`/`4096`, ...).
- Connecting to RDS in a private VPC requires an
  [App Runner VPC connector](https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html);
  swap `EgressType` to `VPC` and add `VpcConnectorArn`.
- 100 MAU: 1 vCPU / 2 GB ≈ $25–45/mo + RDS (Postgres dominates)
- 1k–10k MAU: ≈ $50–150/mo compute + RDS tier
