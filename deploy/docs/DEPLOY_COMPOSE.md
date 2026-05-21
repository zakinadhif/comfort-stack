# Deploy with Docker Compose (bare VPS)

For a plain VPS with Docker installed — no PaaS. Uses
`deploy/docker-compose.selfhost.yml` (Caddy + app + Postgres + MinIO + migrate).

## Prerequisites
- A VPS with Docker + Docker Compose
- A domain with an A/AAAA record pointing at the VPS
- Ports 80 and 443 open

## Setup
```bash
git clone <your-repo> && cd <repo>
cp deploy/.env.example deploy/.env
# Edit deploy/.env — at minimum:
#   APP_DOMAIN=app.example.com
#   APP_URL=https://app.example.com
#   BETTER_AUTH_SECRET=$(openssl rand -base64 32)
#   POSTGRES_PASSWORD=<strong-password>
#   STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY / STORAGE_BUCKET
#   STORAGE_REGION=us-east-1   STORAGE_FORCE_PATH_STYLE=true
```

## First deploy
```bash
docker compose -f deploy/docker-compose.selfhost.yml up -d --build
```
Order of operations: Postgres starts → `migrate` runs and exits → `app` starts →
Caddy fetches TLS for `APP_DOMAIN` and proxies to the app on `:8080`.

Verify:
```bash
curl https://app.example.com/healthz        # {"ok":true,...}
curl https://app.example.com/api/items      # []
# Landing at /, SPA at /app
```

## Subsequent deploys
```bash
git pull
docker compose -f deploy/docker-compose.selfhost.yml up -d --build
```

## Rollback
Check out the previous commit/tag and re-run the `up -d --build` command, or pin
`APP_IMAGE` to a known-good `sha-<short>` tag and `up -d` without `--build`.

## Local full-stack smoke test (no domain/TLS)
The dev compose only runs Postgres + MinIO; run the app with `pnpm dev`. To test
the **bundled image** locally, build and run it directly:
```bash
docker build -f deploy/Dockerfile -t comfort-stack .
docker run --rm -p 8080:8080 --env-file deploy/.env comfort-stack
```
(point `DATABASE_URL`/`STORAGE_ENDPOINT` at reachable services).
