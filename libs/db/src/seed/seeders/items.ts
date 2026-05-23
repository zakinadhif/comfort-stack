import { items } from "../../schema";
import type { Seeder } from "../types";

export const itemsSeeder: Seeder = {
	name: "items",
	description: "Example data for the items table",
	tables: [items],
	async run({ db, log }) {
		const now = new Date();
		const rows = [
			{ id: "seed-welcome", name: "Welcome to Comfort Stack", createdAt: now },
			{ id: "seed-edit", name: "Edit libs/db/src/seed/seeders to add your own", createdAt: now },
			{ id: "seed-reset", name: "Use --reset --yes to wipe and re-seed", createdAt: now },
		];

		const inserted = await db
			.insert(items)
			.values(rows)
			.onConflictDoNothing({ target: items.id })
			.returning({ id: items.id });

		log(`items: inserted ${inserted.length} / ${rows.length}`);
	},
};
