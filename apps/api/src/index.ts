import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createAuth } from "@myapp/auth";
import { loadConfig } from "@myapp/config";
import { createDb } from "@myapp/db";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";

import itemsRouter from "./routes/items";

const config = loadConfig();

type Variables = {
	auth: ReturnType<typeof createAuth>;
	db: ReturnType<typeof createDb>;
};

function getAllowedOrigins(): string[] {
	if (!config.ALLOWED_ORIGINS) return [config.APP_URL];
	const parsed = config.ALLOWED_ORIGINS.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	return parsed.length > 0 ? parsed : [config.APP_URL];
}

// Initialise once at startup (not per-request, since we're on Node.js)
const db = createDb(config.DATABASE_URL);
const auth = createAuth({
	db,
	GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: config.GOOGLE_CLIENT_SECRET,
	BETTER_AUTH_URL: config.BETTER_AUTH_URL ?? config.APP_URL,
	BETTER_AUTH_SECRET: config.BETTER_AUTH_SECRET,
});

const app = new Hono<{ Variables: Variables }>();

// Health check — platform liveness probes (Fly/Render/Cloud Run) hit /healthz;
// /api/healthz is the same payload exposed through the documented API surface.
const health = (c: Context) =>
	c.json({ ok: true, version: process.env.GIT_SHA ?? "dev" });
app.get("/healthz", health);
app.get("/api/healthz", health);

// Scoped CORS for /api/* with an origin allowlist.
app.use(
	"/api/*",
	cors({
		origin: (origin) => {
			if (!origin) return undefined;
			return getAllowedOrigins().includes(origin) ? origin : undefined;
		},
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		exposeHeaders: ["Content-Length"],
		maxAge: 600,
		credentials: true,
	}),
);

// Attach db and auth to context for every request.
app.use("*", async (c, next) => {
	c.set("db", db);
	c.set("auth", auth);
	await next();
});

// Better Auth — handles all /api/auth/* routes.
app.all("/api/auth/*", async (c) => auth.handler(c.req.raw));

// Resource routes.
app.route("/api/items", itemsRouter);

// --- Static frontends (served from the same container in production) ---
// React SPA under /app/* with index.html fallback for client-side routing.
app.use(
	"/app/*",
	serveStatic({
		root: "./public/spa",
		rewriteRequestPath: (p) => p.replace(/^\/app/, ""),
	}),
);
app.get("/app/*", serveStatic({ path: "./public/spa/index.html" }));

// Astro landing at the root.
app.use("/*", serveStatic({ root: "./public/landing" }));

serve({ fetch: app.fetch, port: config.PORT }, () => {
	console.log(`🚀 Server ready at http://localhost:${config.PORT}`);
});

export default app;
