/**
 * Test harness for API route unit tests.
 *
 * Pattern: create a minimal Hono app that mounts only the router under test,
 * inject an in-memory db mock and a configurable auth mock via middleware.
 * No module-level vi.mock() needed — just swap state between tests.
 *
 * The `makeQueryResult` helper is the key trick: it returns an object that
 * satisfies both Drizzle usage patterns at once:
 *
 *   await db.select().from(table)              → resolves via .then() (list query)
 *   await db.select().from(table).where().get() → resolves via .get()  (single-row query)
 */

import { Hono } from "hono";
import { items as itemsTable } from "@myapp/db/schema";
import itemsRouter from "../../src/routes/items";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ItemRow = { id: string; name: string; createdAt: number };
export type DbSeed = { items?: ItemRow[] };
export type MockUser = { id: string; email: string };

// ---------------------------------------------------------------------------
// Drizzle query result helper
// ---------------------------------------------------------------------------

/**
 * Returns an object that behaves like a Drizzle query builder result:
 * - Awaitable directly as a list  (`await db.select().from(table)`)
 * - Has `.get()` for single-row   (`await db.select().from(table).where(...).get()`)
 */
const makeQueryResult = <T>(rows: T[]) => ({
	get: async (): Promise<T | null> => rows[0] ?? null,
	then: <R>(
		resolve: (value: T[]) => R,
		reject?: (reason: unknown) => R,
	) => Promise.resolve(rows).then(resolve, reject),
});

// ---------------------------------------------------------------------------
// In-memory db mock
// ---------------------------------------------------------------------------

export const createDbMock = (seed: DbSeed = {}) => {
	const state = {
		items: seed.items ? [...seed.items] : ([] as ItemRow[]),
	};

	const db = {
		select: (_fields?: unknown) => ({
			from: (table: unknown) => {
				const rows = table === itemsTable ? state.items : [];
				return {
					where: (_condition?: unknown) => makeQueryResult(rows),
					...makeQueryResult(rows),
				};
			},
		}),
		insert: (_table: unknown) => ({
			values: (values: ItemRow) => {
				state.items.push(values);
				return Promise.resolve(undefined);
			},
		}),
		delete: (_table: unknown) => ({
			where: (_condition?: unknown) => Promise.resolve(undefined),
		}),
	};

	return { db, state };
};

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

type MockAuth = {
	api: { getSession: () => Promise<{ user: MockUser; session: { id: string } } | null> };
};

/**
 * Creates a minimal Hono app with only the items router mounted.
 * Pass a `user` to simulate an authenticated request; omit for anonymous.
 */
export const createItemsTestApp = (
	db: ReturnType<typeof createDbMock>["db"],
	user: MockUser | null = null,
) => {
	const mockAuth: MockAuth = {
		api: {
			getSession: async () =>
				user ? { user, session: { id: "test-session-id" } } : null,
		},
	};

	const app = new Hono<{
		Variables: { db: typeof db; auth: typeof mockAuth };
	}>();

	app.use("*", async (c, next) => {
		c.set("db", db as any);
		c.set("auth", mockAuth as any);
		await next();
	});

	app.route("/", itemsRouter);

	return {
		request: (path: string, init?: RequestInit) => app.request(path, init),
	};
};
