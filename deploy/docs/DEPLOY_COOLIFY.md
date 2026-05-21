# Deploy to Coolify / Dokploy

These self-hosting PaaS tools consume `deploy/docker-compose.selfhost.yml`
directly — Postgres, MinIO, the app, the migration job, and Caddy all come up
together.

## Prerequisites
- A Coolify or Dokploy instance on your VPS
- A domain pointed at the VPS (A/AAAA record)

## Steps
1. Connect your Git repository.
2. Create a new resource → **Docker Compose**.
3. Point it at `deploy/docker-compose.selfhost.yml`.
4. Set environment variables in the UI (see [`deploy/.env.example`](../.env.example)):
   - `APP_DOMAIN` — your domain (drives Caddy's auto-TLS)
   - `APP_URL` — `https://<APP_DOMAIN>`
   - `BETTER_AUTH_SECRET`, `POSTGRES_PASSWORD`
   - `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`,
     `STORAGE_REGION`, `STORAGE_FORCE_PATH_STYLE=true`
   - Google OAuth vars if used
5. Deploy.

The `migrate` service runs `node dist/scripts/migrate.js` once each deploy
(after Postgres is healthy) and exits. Caddy obtains TLS certificates
automatically for `APP_DOMAIN`.

## Notes
- If you'd rather pull a prebuilt image than build on the box, set `APP_IMAGE`
  to your GHCR image and the compose `build:` blocks are ignored.
- Only Caddy is exposed (80/443). Postgres and MinIO stay on the internal
  network.

## Cost
- A single small VPS ($5–10/mo) comfortably serves low-thousands MAU since
  Postgres, storage, and app all share the box.
