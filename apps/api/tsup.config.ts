import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node22",
	clean: true,
	sourcemap: true,
	// Bundle workspace dependencies so we don't have to publish them
	noExternal: [
		"@myapp/auth",
		"@myapp/db",
		"@myapp/api-zod",
		"@myapp/storage",
	],
});
