import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/scripts/migrate.ts", "src/scripts/seed.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  // Bundle workspace dependencies so we don't have to publish them
  noExternal: [
    "@myapp/auth",
    "@myapp/config",
    "@myapp/db",
    "@myapp/api-zod",
    "@myapp/storage",
  ],
});
