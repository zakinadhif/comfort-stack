import { itemsSeeder } from "./seeders/items";
import type { Seeder } from "./types";

/**
 * Ordered registry of seeders. Order matters when seeders depend on each
 * other (e.g. an `orders` seeder that references rows created by `users`).
 *
 * To add a new seeder:
 *   1. Create `libs/db/src/seed/seeders/<name>.ts` exporting a `Seeder`.
 *   2. Import it here and append to the array.
 */
export const seeders: readonly Seeder[] = [itemsSeeder];

export { runSeedCli } from "./runner";
export type { Seeder, SeedContext, SeedDb } from "./types";
