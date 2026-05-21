// ---------------------------------------------------------------------------
// StorageProvider — unified interface over object storage backends
// ---------------------------------------------------------------------------

export interface PutOptions {
	/** MIME type of the object (e.g. "image/png") */
	contentType?: string;
	/** Arbitrary key/value metadata stored alongside the object */
	metadata?: Record<string, string>;
}

/**
 * Common interface implemented by every storage adapter.
 * Swap between S3 and GCS at runtime by choosing a different factory.
 */
export interface StorageProvider {
	/**
	 * Upload (or overwrite) an object at `key`.
	 */
	put(
		key: string,
		body: Buffer | Uint8Array | string,
		options?: PutOptions,
	): Promise<void>;

	/**
	 * Download an object. Returns `null` when the key does not exist.
	 */
	get(key: string): Promise<Buffer | null>;

	/**
	 * Delete an object. No-ops when the key does not exist.
	 */
	delete(key: string): Promise<void>;

	/**
	 * Generate a time-limited pre-signed URL for direct client downloads.
	 * @param expiresInSeconds defaults to 3 600 (1 hour)
	 */
	getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

// ---------------------------------------------------------------------------
// Re-export adapter factories
// ---------------------------------------------------------------------------

export { createStorageFromEnv } from "./from-env";
export type { GcsConfig } from "./gcs";

export { createGcsStorage } from "./gcs";
export type { S3Config } from "./s3";
export { createS3Storage } from "./s3";
