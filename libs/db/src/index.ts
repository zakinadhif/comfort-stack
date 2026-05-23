import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Creates a Drizzle client backed by postgres-js.
 *
 * `url` is a standard Postgres connection string (`postgres://...`), so the
 * same code points at Neon, Supabase, Cloud SQL, or a self-hosted Postgres
 * with no change.
 */
export const createDb = (url: string) => {
	const client = postgres(url);
	return drizzle(client, { schema });
};

export type Db = ReturnType<typeof createDb>;

/**
 * Runs pending SQL migrations from `migrationsFolder`, then closes the
 * connection. Intended for a one-shot deploy step (Fly release command,
 * Railway/Render predeploy, Cloud Run Job) — never on app startup.
 */
export async function runMigrations(url: string, migrationsFolder: string) {
	const client = postgres(url, { max: 1 });
	try {
		await migrate(drizzle(client), { migrationsFolder });
	} finally {
		await client.end();
	}
}

export { runSeedCli, seeders } from "./seed";
export type { Seeder, SeedContext, SeedDb } from "./seed";
