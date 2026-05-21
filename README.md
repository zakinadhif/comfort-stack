# Comfort Stack

A production-ready, fully type-safe full-stack monorepo template. OpenAPI-first: one spec drives both the typed React Query client and server-side Zod validators. The API runs on Node.js and deploys anywhere via Docker.

---

## Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 22 |
| **API** | Hono v4 (`@hono/node-server`) |
| **Database ORM** | Drizzle ORM (SQLite / better-sqlite3) |
| **Auth** | Better Auth (drizzle adapter, DB-backed sessions) |
| **Storage** | Pluggable — AWS S3 or Google Cloud Storage (`@myapp/storage`) |
| **API Codegen** | Orval (OpenAPI → React Query hooks + Zod validators) |
| **Frontend** | React 19 + Vite + TailwindCSS v4 + shadcn/ui |
| **Routing** | Wouter |
| **Data Fetching** | TanStack Query v5 |
| **Landing** | Astro v6 |
| **Monorepo** | pnpm workspaces |
| **Linting/Formatting** | Biome |
| **Language** | TypeScript ~5.9 |

---

## Architecture

```
my-app/
├── apps/
│   ├── api/       # Hono API → Node.js (Docker)
│   ├── app/       # React SPA → Cloudflare Pages / any static host
│   └── landing/   # Astro landing page → Cloudflare Pages / any static host
└── libs/
    ├── api-spec/         # openapi.yaml + orval.config.ts (source of truth)
    ├── api-client-react/ # Generated: TanStack Query hooks (@myapp/api-client-react)
    ├── api-zod/          # Generated: Zod validators (@myapp/api-zod)
    ├── auth/             # Better Auth config (@myapp/auth)
    ├── db/               # Drizzle schema + SQLite client (@myapp/db)
    └── storage/          # S3 / GCS storage adapters (@myapp/storage)
```

### OpenAPI-first flow

`libs/api-spec/openapi.yaml` is the **single source of truth** for your API contract. Running `pnpm codegen` drives the entire client generation pipeline:

- **`libs/api-client-react/src/generated/`** — Fully-typed TanStack Query hooks (e.g. `useListItems`, `useCreateItem`) backed by a production-quality `customFetch` mutator with structured error handling.
- **`libs/api-zod/src/generated/`** — Zod validators for every request/response schema, ready to use in your Hono route handlers for runtime validation.

No manual API client code. Change the spec → run `pnpm codegen` → your entire stack is in sync.

---

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10 — `npm i -g pnpm`

---

## Quick Start

### 1. Use this template / clone

Click **"Use this template"** on GitHub, or clone directly:

```
git clone https://github.com/your-org/my-app.git
cd my-app
```

### 2. Install dependencies

```
pnpm install
```

### 3. Configure local environment variables

Copy the example env file in `apps/api/` and fill in your values:

```
cp apps/api/.env.example apps/api/.env
# Then edit apps/api/.env with your credentials
```

### 4. Generate the auth schema

```
pnpm better-auth:generate
```

This runs the Better Auth CLI against `libs/auth/src/index.ts` and outputs the auth tables schema to `libs/db/src/schema/auth.ts`. Then uncomment the `export * from "./auth"` line in `libs/db/src/schema/index.ts`.

### 5. Push the schema to your local database

```
pnpm db:push
```

This creates/updates the local SQLite database file (defaults to `./local.db` in the API directory, configurable via `DATABASE_URL`).

### 6. Generate the API client

```
pnpm codegen
```

This generates typed React Query hooks into `libs/api-client-react/src/generated/` and Zod validators into `libs/api-zod/src/generated/`.

### 7. Start development

```
# Terminal 1 — Hono API on http://localhost:3000
pnpm dev:api

# Terminal 2 — React SPA on http://localhost:5173
pnpm dev:app
```

---

## Scripts Reference

| Script | Description |
|---|---|
| `pnpm dev:api` | Start the Hono API via tsx watch (`apps/api`) |
| `pnpm dev:app` | Start the React SPA via Vite (`apps/app`) |
| `pnpm dev:landing` | Start the Astro landing page (`apps/landing`) |
| `pnpm codegen` | Run Orval to regenerate React Query hooks and Zod validators from `openapi.yaml` |
| `pnpm better-auth:generate` | Run the Better Auth CLI to regenerate `libs/db/src/schema/auth.ts` |
| `pnpm db:push` | Push the Drizzle schema to the SQLite database |
| `pnpm db:studio` | Open Drizzle Studio connected to the SQLite database |
| `pnpm db:generate` | Generate Drizzle migration files from schema changes |
| `pnpm format` | Format all files with Biome |
| `pnpm lint` | Lint all files with Biome (read-only) |
| `pnpm lint:fix` | Lint and auto-fix all files with Biome |
| `pnpm test:api` | Run Vitest unit tests for the API (`apps/api`) |
| `pnpm test:api:watch` | Run Vitest in watch mode for the API |
| `pnpm test:e2e` | Run Playwright E2E tests headlessly (`apps/app`) |
| `pnpm test:e2e:ui` | Run Playwright E2E tests with the interactive UI runner |

---

## Environment Variables

### `apps/api/.env` (local development)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3000`) |
| `DATABASE_URL` | Path to the SQLite database file (default: `./local.db`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BETTER_AUTH_URL` | Base URL for auth callbacks (e.g. `http://localhost:5173`) |
| `BETTER_AUTH_SECRET` | Secret key for signing auth tokens |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |

---

## Adding a New API Route

Follow this workflow to keep the entire stack in sync:

### 1. Update the OpenAPI spec

Add your new path and schema definitions to `libs/api-spec/openapi.yaml`:

```yaml
# Example: add a new /widgets resource
paths:
  /widgets:
    get:
      operationId: listWidgets
      tags: [widgets]
      summary: List widgets
      responses:
        "200":
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Widget"
components:
  schemas:
    Widget:
      type: object
      properties:
        id:
          type: string
        label:
          type: string
      required: [id, label]
```

### 2. Regenerate the client and validators

```
pnpm codegen
```

This regenerates:
- `libs/api-client-react/src/generated/` — new `useListWidgets` hook and friends
- `libs/api-zod/src/generated/` — new `widgetSchema` and request validators

### 3. Create the Hono route handler

```ts
import { Hono } from "hono";
import type { createAuth } from "@myapp/auth";
import type { createDb } from "@myapp/db";

type Variables = {
  auth: ReturnType<typeof createAuth>;
  db: ReturnType<typeof createDb>;
};

const app = new Hono<{ Variables: Variables }>();

app.get("/", async (c) => {
  const db = c.get("db");
  const widgets = await db.query.widgets.findMany();
  return c.json(widgets);
});

export default app;
```

### 4. Register the router

In `apps/api/src/index.ts`, mount the new router:

```ts
import widgetsRouter from "./routes/widgets";

app.route("/api/widgets", widgetsRouter);
```

### 5. Use the generated hook in React

```tsx
import { useListWidgets } from "@myapp/api-client-react";

export function WidgetList() {
  const { data, isLoading } = useListWidgets();
  if (isLoading) return <p>Loading...</p>;
  return <ul>{data?.map((w) => <li key={w.id}>{w.label}</li>)}</ul>;
}
```

---

## Database Workflow

- **Schema location**: `libs/db/src/schema/*.ts` — add a new file per entity and re-export it from `libs/db/src/schema/index.ts`.
- **Auth schema**: Auto-generated by `pnpm better-auth:generate` — outputs to `libs/db/src/schema/auth.ts`. Do not edit this file manually; re-run the command after changing auth config.
- **Local dev**: `pnpm db:push` reads/creates the SQLite file specified by `DATABASE_URL` (defaults to `./local.db`).
- **Drizzle Studio**: `pnpm db:studio` opens a browser-based DB browser.

> **Note**: The `tablesFilter` in `drizzle.config.ts` excludes `auth_*` (managed by Better Auth) tables so Drizzle Kit never touches them.

---

## Storage

The `@myapp/storage` package provides a unified `StorageProvider` interface with adapters for:

- **AWS S3** (and S3-compatible services like MinIO, Backblaze B2, DigitalOcean Spaces)
- **Google Cloud Storage**

```ts
import { createS3Storage, createGcsStorage } from "@myapp/storage";

// AWS S3
const s3 = createS3Storage({
  bucket: "my-bucket",
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Google Cloud Storage
const gcs = createGcsStorage({
  bucket: "my-bucket",
  projectId: "my-gcp-project",
});

// Both expose the same interface
await storage.put("uploads/photo.jpg", buffer, { contentType: "image/jpeg" });
const file = await storage.get("uploads/photo.jpg");
const url = await storage.getSignedUrl("uploads/photo.jpg", 3600);
await storage.delete("uploads/photo.jpg");
```

---

## Auth Setup

Auth is configured in `libs/auth/src/index.ts` using `createAuth()`.

**Supported providers out of the box:**
- Email & password
- Google OAuth

**After changing auth configuration:**

```
pnpm better-auth:generate
```

This regenerates the auth database schema. Uncomment (or keep uncommented) `export * from "./auth"` in `libs/db/src/schema/index.ts`, then run `pnpm db:push` to apply the changes.

**Client-side:**

Use the `authClient` exported from `apps/app/src/lib/auth-client.ts` to call sign-in, sign-up, and session endpoints from your React components.

---

## Deployment

### API (Docker)

A multi-stage `Dockerfile` is provided at `apps/api/Dockerfile`. Build and run:

```bash
# Build from the monorepo root
docker build -f apps/api/Dockerfile -t my-app-api .

# Run with a persistent database volume
docker run -d \
  -p 3000:3000 \
  -v my-app-data:/app/data \
  -e DATABASE_URL=/app/data/production.db \
  -e BETTER_AUTH_SECRET=your-secret \
  -e BETTER_AUTH_URL=https://app.example.com \
  -e GOOGLE_CLIENT_ID=your-client-id \
  -e GOOGLE_CLIENT_SECRET=your-client-secret \
  -e ALLOWED_ORIGINS=https://app.example.com \
  my-app-api
```

The image is based on `node:22-alpine` and bundles all workspace dependencies via `tsup`, resulting in a minimal production footprint.

### App (Static hosting)

Build and deploy the React SPA to any static host (Cloudflare Pages, Vercel, Netlify, S3 + CloudFront, etc.):

```bash
pnpm --filter app run build
# Output: apps/app/dist/
```

### Landing (Static hosting)

Same as above, using `apps/landing`:

```bash
pnpm --filter landing run build
# Output: apps/landing/dist/
```

---

## License

MIT
