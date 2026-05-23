import { Storage } from "@google-cloud/storage";
import type { PutOptions, StorageProvider } from "./index";

export interface GcsConfig {
  /** GCS bucket name */
  bucket: string;
  /** GCP project ID. Inferred from the environment when omitted. */
  projectId?: string;
  /**
   * Absolute path to a service-account JSON key file.
   * Falls back to Application Default Credentials (ADC) when omitted,
   * which works automatically on GCE/Cloud Run/GKE.
   */
  keyFilename?: string;
}

/**
 * Creates a Google Cloud Storage adapter.
 *
 * @example
 * ```ts
 * // With explicit service-account key (local dev / CI)
 * const storage = createGcsStorage({
 *   bucket: "my-bucket",
 *   projectId: "my-gcp-project",
 *   keyFilename: "/run/secrets/gcs-key.json",
 * });
 *
 * // With Application Default Credentials (GCE / Cloud Run / GKE)
 * const storage = createGcsStorage({ bucket: "my-bucket" });
 * ```
 */
export function createGcsStorage(config: GcsConfig): StorageProvider {
  const storage = new Storage({
    projectId: config.projectId,
    keyFilename: config.keyFilename,
  });

  const bucket = storage.bucket(config.bucket);

  return {
    async put(key, body, options?: PutOptions) {
      const file = bucket.file(key);
      await file.save(body as Buffer, {
        contentType: options?.contentType,
        metadata: options?.metadata,
        resumable: false, // avoids extra round-trips for small objects
      });
    },

    async get(key) {
      try {
        const [contents] = await bucket.file(key).download();
        return contents;
      } catch {
        return null;
      }
    },

    async delete(key) {
      try {
        await bucket.file(key).delete();
      } catch {
        // no-op when the key does not exist
      }
    },

    async getSignedUrl(key, expiresInSeconds = 3600) {
      const [url] = await bucket.file(key).getSignedUrl({
        action: "read",
        expires: Date.now() + expiresInSeconds * 1000,
      });
      return url;
    },
  };
}
