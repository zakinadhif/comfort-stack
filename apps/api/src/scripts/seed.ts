import { loadConfig } from "@myapp/config";
import { runSeedCli, seeders } from "@myapp/db";

/**
 * Seed CLI. Reads DATABASE_URL via @myapp/config and dispatches to the
 * seed runner in @myapp/db. The runner parses flags from process.argv:
 *
 *   pnpm db:seed                           # run all seeders
 *   pnpm db:seed -- --only items           # run a single seeder
 *   pnpm db:seed -- --reset --yes          # truncate then re-seed
 *   pnpm db:seed -- --list                 # list registered seeders
 *   pnpm db:seed -- --help                 # full usage
 *
 * Production safety: refuses to run when NODE_ENV=production unless
 * `--force` is also passed.
 */
await runSeedCli({
	loadConfig: () => {
		const config = loadConfig();
		return {
			databaseUrl: config.DATABASE_URL,
			isProduction: config.NODE_ENV === "production",
		};
	},
	seeders,
});
