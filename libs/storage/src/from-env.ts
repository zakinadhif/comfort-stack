import { loadStorageConfig } from "@myapp/config";
import type { StorageProvider } from "./index";
import { createS3Storage } from "./s3";

/**
 * Builds an S3-compatible storage adapter from validated STORAGE_* env vars.
 *
 * One adapter, four providers — the only knobs that vary are STORAGE_ENDPOINT
 * (omit for AWS S3) and STORAGE_FORCE_PATH_STYLE (true for MinIO). See
 * deploy/docs/STORAGE_PROVIDERS.md for the per-provider table.
 */
export function createStorageFromEnv(): StorageProvider {
	const cfg = loadStorageConfig();
	return createS3Storage({
		bucket: cfg.bucket,
		region: cfg.region,
		accessKeyId: cfg.accessKey,
		secretAccessKey: cfg.secretKey,
		endpoint: cfg.endpoint,
		forcePathStyle: cfg.forcePathStyle,
	});
}
