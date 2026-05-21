import { describe, expect, it } from "vitest";
import { createDbMock, createItemsTestApp } from "../helpers/harness";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER = { id: "user-1", email: "user@test.com" };

const SEED = [
	{ id: "item-1", name: "First Item", createdAt: 1700000000000 },
	{ id: "item-2", name: "Second Item", createdAt: 1700000001000 },
] as const;

// ---------------------------------------------------------------------------
// GET /
// ---------------------------------------------------------------------------

describe("GET /", () => {
	it("returns an empty array when no items exist", async () => {
		const { db } = createDbMock();
		const { request } = createItemsTestApp(db);

		const res = await request("/");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it("returns all seeded items", async () => {
		const { db } = createDbMock({ items: [...SEED] });
		const { request } = createItemsTestApp(db);

		const res = await request("/");
		const body = (await res.json()) as typeof SEED;

		expect(res.status).toBe(200);
		expect(body).toHaveLength(2);
		expect(body[0]?.name).toBe("First Item");
		expect(body[1]?.name).toBe("Second Item");
	});
});

// ---------------------------------------------------------------------------
// POST /
// ---------------------------------------------------------------------------

describe("POST /", () => {
	it("returns 401 when not authenticated", async () => {
		const { db } = createDbMock();
		const { request } = createItemsTestApp(db); // no user → unauthenticated

		const res = await request("/", {
			method: "POST",
			body: JSON.stringify({ name: "New Item" }),
			headers: { "Content-Type": "application/json" },
		});

		expect(res.status).toBe(401);
	});

	it("returns 400 when name is missing", async () => {
		const { db } = createDbMock();
		const { request } = createItemsTestApp(db, USER);

		const res = await request("/", {
			method: "POST",
			body: JSON.stringify({}),
			headers: { "Content-Type": "application/json" },
		});

		expect(res.status).toBe(400);
	});

	it("creates an item and returns 201 when authenticated", async () => {
		const { db, state } = createDbMock();
		const { request } = createItemsTestApp(db, USER);

		const res = await request("/", {
			method: "POST",
			body: JSON.stringify({ name: "New Item" }),
			headers: { "Content-Type": "application/json" },
		});

		const body = (await res.json()) as { id: string; name: string; createdAt: string };

		expect(res.status).toBe(201);
		expect(body.name).toBe("New Item");
		expect(typeof body.id).toBe("string");
		expect(typeof body.createdAt).toBe("string");
		// Verify the item was added to state
		expect(state.items).toHaveLength(1);
		expect(state.items[0]?.name).toBe("New Item");
	});
});

// ---------------------------------------------------------------------------
// GET /:itemId
// ---------------------------------------------------------------------------

describe("GET /:itemId", () => {
	it("returns 404 when item does not exist", async () => {
		const { db } = createDbMock(); // empty state → .get() returns null
		const { request } = createItemsTestApp(db);

		const res = await request("/non-existent-id");

		expect(res.status).toBe(404);
	});

	it("returns the item when it exists", async () => {
		const { db } = createDbMock({ items: [{ ...SEED[0] }] });
		const { request } = createItemsTestApp(db);

		const res = await request("/item-1");
		const body = (await res.json()) as { id: string; name: string };

		expect(res.status).toBe(200);
		expect(body.id).toBe("item-1");
		expect(body.name).toBe("First Item");
	});
});

// ---------------------------------------------------------------------------
// DELETE /:itemId
// ---------------------------------------------------------------------------

describe("DELETE /:itemId", () => {
	it("returns 401 when not authenticated", async () => {
		const { db } = createDbMock({ items: [{ ...SEED[0] }] });
		const { request } = createItemsTestApp(db); // no user

		const res = await request("/item-1", { method: "DELETE" });

		expect(res.status).toBe(401);
	});

	it("returns 404 when item does not exist", async () => {
		const { db } = createDbMock(); // empty state → existence check returns null
		const { request } = createItemsTestApp(db, USER);

		const res = await request("/non-existent-id", { method: "DELETE" });

		expect(res.status).toBe(404);
	});

	it("returns 204 when item is found and deleted", async () => {
		const { db } = createDbMock({ items: [{ ...SEED[0] }] });
		const { request } = createItemsTestApp(db, USER);

		const res = await request("/item-1", { method: "DELETE" });

		expect(res.status).toBe(204);
	});
});
