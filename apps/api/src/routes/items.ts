import { Hono } from "hono";
import { createAuth } from "@myapp/auth";
import { createDb } from "@myapp/db";
import { items } from "@myapp/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

type Variables = {
	auth: ReturnType<typeof createAuth>;
	db: ReturnType<typeof createDb>;
};

const app = new Hono<{ Variables: Variables }>();

// GET /api/items — list all items
app.get("/", async (c) => {
	const db = c.get("db");
	const allItems = await db.select().from(items);
	return c.json(allItems);
});

// POST /api/items — create an item (requires auth)
app.post("/", async (c) => {
	const auth = c.get("auth");
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json<{ name: string }>();

	if (!body.name || typeof body.name !== "string") {
		return c.json({ error: "name is required" }, 400);
	}

	const db = c.get("db");
	const newItem = {
		id: randomUUID(),
		name: body.name.trim(),
		createdAt: new Date(),
	};

	await db.insert(items).values(newItem);
	return c.json(newItem, 201);
});

// GET /api/items/:itemId — get a single item
app.get("/:itemId", async (c) => {
	const { itemId } = c.req.param();
	const db = c.get("db");

	const item = await db.select().from(items).where(eq(items.id, itemId)).get();

	if (!item) {
		return c.json({ error: "Item not found" }, 404);
	}

	return c.json(item);
});

// DELETE /api/items/:itemId — delete an item (requires auth)
app.delete("/:itemId", async (c) => {
	const auth = c.get("auth");
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session?.user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { itemId } = c.req.param();
	const db = c.get("db");

	const existing = await db
		.select({ id: items.id })
		.from(items)
		.where(eq(items.id, itemId))
		.get();

	if (!existing) {
		return c.json({ error: "Item not found" }, 404);
	}

	await db.delete(items).where(eq(items.id, itemId));
	return new Response(null, { status: 204 });
});

export default app;
