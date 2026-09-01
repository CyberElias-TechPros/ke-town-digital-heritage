import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow access from any host (including ephemeral preview hosts and LAN).
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    // In dev/preview the API is served by the local Cloudflare Worker
    // (wrangler dev). Proxy /api to it so the browser only ever talks to this
    // origin. In production the frontend calls the Worker's public URL directly.
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react-jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom", "react-helmet-async"],
          query: ["@tanstack/react-query", "react-hook-form", "zod", "@hookform/resolvers"],
          ui: [
            "framer-motion", "lucide-react", "sonner", "next-themes",
            "class-variance-authority", "tailwind-merge", "clsx",
          ],
          charts: ["recharts"],
          stripe: ["@stripe/stripe-js"],
          sockets: ["socket.io-client"],
        },
      },
    },
  },
}));
