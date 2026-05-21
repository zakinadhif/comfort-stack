import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { PutOptions, StorageProvider } from "./index";

export interface S3Config {
	/** S3 bucket name */
	bucket: string;
	/** AWS region (e.g. "us-east-1") */
	region: string;
	/** AWS access key ID. Falls back to the default credential chain when omitted. */
	accessKeyId?: string;
	/** AWS secret access key. Required when `accessKeyId` is provided. */
	secretAccessKey?: string;
	/**
	 * Custom endpoint URL for S3-compatible services (e.g. MinIO, Backblaze B2,
	 * DigitalOcean Spaces). Leave undefined when using real AWS S3.
	 */
	endpoint?: string;
	/**
	 * Force path-style addressing (`bucket.endpoint/key` vs `endpoint/bucket/key`).
	 * Usually required for MinIO and other self-hosted S3-compatible servers.
	 */
	forcePathStyle?: boolean;
}

/**
 * Creates an AWS S3 storage adapter.
 *
 * @example
 * ```ts
 * // AWS S3
 * const storage = createS3Storage({
 *   bucket: "my-bucket",
 *   region: "us-east-1",
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 * });
 *
 * // MinIO / S3-compatible
 * const storage = createS3Storage({
 *   bucket: "my-bucket",
 *   region: "us-east-1",
 *   endpoint: "http://localhost:9000",
 *   forcePathStyle: true,
 *   accessKeyId: "minio-user",
 *   secretAccessKey: "minio-password",
 * });
 * ```
 */
export function createS3Storage(config: S3Config): StorageProvider {
	const client = new S3Client({
		region: config.region,
		...(config.accessKeyId && {
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey!,
			},
		}),
		...(config.endpoint && { endpoint: config.endpoint }),
		forcePathStyle: config.forcePathStyle ?? false,
	});

	return {
		async put(key, body, options?: PutOptions) {
			await client.send(
				new PutObjectCommand({
					Bucket: config.bucket,
					Key: key,
					Body: body as Buffer,
					ContentType: options?.contentType,
					Metadata: options?.metadata,
				}),
			);
		},

		async get(key) {
			try {
				const result = await client.send(
					new GetObjectCommand({ Bucket: config.bucket, Key: key }),
				);
				const bytes = await result.Body?.transformToByteArray();
				return bytes ? Buffer.from(bytes) : null;
			} catch {
				return null;
			}
		},

		async delete(key) {
			await client.send(
				new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
			);
		},

		async getSignedUrl(key, expiresInSeconds = 3600) {
			const command = new GetObjectCommand({
				Bucket: config.bucket,
				Key: key,
			});
			return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
		},
	};
}
