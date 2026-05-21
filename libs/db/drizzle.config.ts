/// <reference types="node" />
import { defineConfig } from "drizzle-kit";

// Defaults to the docker-compose.dev.yml Postgres so `db:generate` (which only
// reads the schema) and `db:push`/`db:studio` (which connect) work locally.
// Set DATABASE_URL to target another database.
const databaseUrl =
	process.env.DATABASE_URL ??
	"postgres://comfort:comfort@localhost:5432/comfort";

export default defineConfig({
	out: "./migrations",
	schema: "./src/schema/*.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
	tablesFilter: ["!auth_*"],
});
