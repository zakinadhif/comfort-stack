import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createAuth } from "@myapp/auth";
import { createDb } from "@myapp/db";

import itemsRouter from "./routes/items";

type Variables = {
	auth: ReturnType<typeof createAuth>;
	db: ReturnType<typeof createDb>;
};

const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:4321",
	"http://127.0.0.1:4321",
];

function getAllowedOrigins(): string[] {
	const rawOrigins = process.env.ALLOWED_ORIGINS;
	if (!rawOrigins) return DEFAULT_ALLOWED_ORIGINS;
	const parsed = rawOrigins
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

// Initialise once at startup (not per-request, since we're on Node.js)
const db = createDb(process.env.DATABASE_URL ?? "./local.db");
const auth = createAuth({
	db,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
	BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
});

const app = new Hono<{ Variables: Variables }>();

// Global CORS (permissive — tighten for production)
app.use("*", cors());

// Scoped CORS for /api/* routes with origin allowlist
app.use(
	"/api/*",
	cors({
		origin: (origin, c) => {
			if (!origin) return undefined;
			const allowed = getAllowedOrigins();
			return allowed.includes(origin) ? origin : undefined;
		},
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

// Attach db and auth to context for every request
app.use("*", async (c, next) => {
	c.set("db", db);
	c.set("auth", auth);
	await next();
});

// Better Auth — handles all /api/auth/* routes
app.all("/api/auth/*", async (c) => {
	return auth.handler(c.req.raw);
});

// Resource routes
app.route("/api/items", itemsRouter);

// Health check
app.get("/api/healthz", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (c) => {
	return c.text("Hello from Hono!");
});

const PORT = parseInt(process.env.PORT ?? "3000", 10);
serve({ fetch: app.fetch, port: PORT }, () => {
	console.log(`🚀 Server ready at http://localhost:${PORT}`);
});

export default app;
