import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where `wrangler dev` listens. Override with WORKER_PORT if you moved it.
  const workerPort = env.WORKER_PORT || "8787";
  const workerTarget = `http://127.0.0.1:${workerPort}`;

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: { overlay: false },
      // Same-origin /api for the browser: the dev server forwards to the
      // Cloudflare Worker, so no CORS headers are needed in development and
      // the exact same relative URLs work in production.
      proxy: {
        "/api": {
          target: workerTarget,
          changeOrigin: true,
          ws: true,
        },
      },
      allowedHosts: true,
    },
    preview: {
      host: "0.0.0.0",
      port: 8080,
      allowedHosts: true,
      proxy: {
        "/api": { target: workerTarget, changeOrigin: true, ws: true },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react-jsx-dev-runtime"],
    },
  };
});
