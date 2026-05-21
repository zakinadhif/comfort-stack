# Storage providers

The app talks to object storage through one S3-compatible adapter
(`libs/storage`). Cloudflare R2, Backblaze B2, AWS S3, and MinIO all speak the
same protocol, so switching providers is a matter of env vars — no code change.

The only knobs that vary per provider are `STORAGE_ENDPOINT` (omit for AWS S3)
and `STORAGE_FORCE_PATH_STYLE` (`true` only for MinIO).

| Provider | `STORAGE_ENDPOINT` | `STORAGE_REGION` | `STORAGE_FORCE_PATH_STYLE` | Notes |
|----------|--------------------|------------------|----------------------------|-------|
| Cloudflare R2 | `https://<account_id>.r2.cloudflarestorage.com` | `auto` | `false` | Free egress; cheapest at scale |
| Backblaze B2 | `https://s3.<region>.backblazeb2.com` | e.g. `us-west-002` | `false` | Cheapest storage; small egress fees |
| AWS S3 | _(omit)_ | e.g. `ap-southeast-1` | `false` | SDK uses the real AWS endpoint when none is set |
| MinIO (self-host) | `http://minio:9000` (compose) or your domain | `us-east-1` | `true` | Path-style required |

All four also need:

```
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=...
```

Storage is optional as a group — omit all `STORAGE_*` vars to run without object
storage. `libs/config` only enforces completeness when `createStorageFromEnv()`
is actually called.

```ts
import { createStorageFromEnv } from "@myapp/storage";

const storage = createStorageFromEnv(); // reads STORAGE_* from validated config
await storage.put("uploads/photo.jpg", buffer, { contentType: "image/jpeg" });
const url = await storage.getSignedUrl("uploads/photo.jpg", 3600);
```
