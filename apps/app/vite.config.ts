import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_DEV_TARGET || "http://127.0.0.1:8080";

  return {
    // Production builds are served under /app/* by the Hono container, so
    // assets and the Wouter base (import.meta.env.BASE_URL) must be prefixed.
    // Dev keeps "/" so the Vite server and e2e tests run at the root.
    base: command === "build" ? "/app/" : "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
