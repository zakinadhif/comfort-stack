import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const createDb = (url: string) => {
	const sqlite = new Database(url);
	// Enable WAL mode for better concurrent read performance
	sqlite.pragma("journal_mode = WAL");
	return drizzle(sqlite, { schema });
};

export type Db = ReturnType<typeof createDb>;
