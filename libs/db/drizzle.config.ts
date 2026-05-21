/// <reference types="node" />
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "./local.db";

export default defineConfig({
	out: "./src/migrations",
	schema: "./src/schema/*.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: databaseUrl,
	},
	tablesFilter: ["!auth_*"],
});
