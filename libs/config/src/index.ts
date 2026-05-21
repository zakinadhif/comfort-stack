import { z } from "zod";

/**
 * Parses an environment-variable boolean. Plain `z.coerce.boolean()` is a
 * footgun here: `Boolean("false") === true`. We treat only the canonical
 * truthy spellings as `true`.
 */
const envBool = (defaultValue: boolean) =>
	z
		.string()
		.optional()
		.transform((v) => {
			if (v === undefined || v === "") return defaultValue;
			return ["1", "true", "yes", "on"].includes(v.toLowerCase());
		});

const schema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
	PORT: z.coerce.number().int().positive().default(8080),

	/** Public base URL the app is served from (used for auth callbacks, links). */
	APP_URL: z.string().url(),

	// --- Database (Postgres wire protocol) ---
	DATABASE_URL: z.string().url(),

	// --- Storage (S3-compatible: AWS S3, Cloudflare R2, Backblaze B2, MinIO) ---
	// Optional as a group: omit to run without object storage (e.g. local dev
	// that doesn't touch uploads). `loadStorageConfig()` enforces completeness
	// when storage is actually used.
	STORAGE_ENDPOINT: z.string().url().optional(), // omit for AWS S3
	STORAGE_REGION: z.string().default("auto"),
	STORAGE_ACCESS_KEY: z.string().optional(),
	STORAGE_SECRET_KEY: z.string().optional(),
	STORAGE_BUCKET: z.string().optional(),
	STORAGE_FORCE_PATH_STYLE: envBool(false), // true for MinIO

	// --- Auth (Better Auth) ---
	BETTER_AUTH_SECRET: z.string().min(32),
	/** Defaults to APP_URL when unset. */
	BETTER_AUTH_URL: z.string().url().optional(),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	/** Comma-separated CORS allowlist. Defaults to APP_URL when unset. */
	ALLOWED_ORIGINS: z.string().optional(),
});

export type Config = z.infer<typeof schema>;

let cached: Config | undefined;

/**
 * Parse and validate `process.env` once. Throws a readable error and exits on
 * invalid/missing vars (fail fast at startup).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
	if (cached) return cached;
	const result = schema.safeParse(env);
	if (!result.success) {
		const issues = result.error.issues
			.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
			.join("\n");
		throw new Error(`Invalid environment configuration:\n${issues}`);
	}
	cached = result.data;
	return cached;
}

export interface StorageConfig {
	endpoint?: string;
	region: string;
	accessKey: string;
	secretKey: string;
	bucket: string;
	forcePathStyle: boolean;
}

/**
 * Returns the storage config, asserting that all required STORAGE_* vars are
 * present. Call this only from code paths that actually use object storage.
 */
export function loadStorageConfig(
	config: Config = loadConfig(),
): StorageConfig {
	const missing = (
		["STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY", "STORAGE_BUCKET"] as const
	).filter((k) => !config[k]);
	if (missing.length > 0) {
		throw new Error(
			`Object storage is not configured. Missing: ${missing.join(", ")}`,
		);
	}
	return {
		endpoint: config.STORAGE_ENDPOINT,
		region: config.STORAGE_REGION,
		accessKey: config.STORAGE_ACCESS_KEY as string,
		secretKey: config.STORAGE_SECRET_KEY as string,
		bucket: config.STORAGE_BUCKET as string,
		forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
	};
}
