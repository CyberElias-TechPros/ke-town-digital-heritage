// ============================================================
// KE Kingdom Digital Heritage — Cloudflare Workers entry point
// REST API + Durable Objects (chat) over Cloudflare D1.
// ============================================================
import { handleOptions, notFound, fail } from "./lib/http.js";
import { handleAuth } from "./routes/auth.js";
import { handleUsers } from "./routes/users.js";
import { handleSocial } from "./routes/social.js";
import { handleCommunity } from "./routes/community.js";
import { handleCommerce } from "./routes/commerce.js";
import { handleContent } from "./routes/content.js";
import { handleSearch } from "./routes/search.js";
import { handleAdmin } from "./routes/admin.js";
import { handleUpload } from "./routes/upload.js";
import { handleMisc } from "./routes/misc.js";
import { ChatDurableObject } from "./chat.js";

// Map of API prefix -> handler module. Each handler receives
// (request, env, ctx) and returns a Response.
const MODULES = [
  ["/api/auth/", handleAuth],
  ["/api/users/", handleUsers],
  ["/api/admin/", handleAdmin],
  ["/api/upload", handleUpload],
  ["/api/search", handleSearch],
  // commerce
  ["/api/marketplace", handleCommerce],
  ["/api/marketplace/", handleCommerce],
  ["/api/products/", handleCommerce],
  ["/api/cart", handleCommerce],
  ["/api/orders", handleCommerce],
  ["/api/order", handleCommerce],
  ["/api/shop", handleCommerce],
  ["/api/reviews", handleCommerce],
  ["/api/checkout", handleCommerce],
  ["/api/addresses", handleCommerce],
  ["/api/payments", handleCommerce],
  ["/api/transactions", handleCommerce],
  // community
  ["/api/groups/", handleCommunity],
  ["/api/groups", handleCommunity],
  ["/api/events/", handleCommunity],
  ["/api/events", handleCommunity],
  ["/api/gallery", handleCommunity],
  ["/api/notifications", handleCommunity],
  ["/api/conversations", handleCommunity],
  ["/api/messages", handleCommunity],
  ["/api/calendar", handleCommunity],
  ["/api/polls", handleCommunity],
  ["/api/campaigns", handleCommunity],
  ["/api/petitions", handleCommunity],
  ["/api/volunteer", handleCommunity],
  // social
  ["/api/posts/", handleSocial],
  ["/api/posts", handleSocial],
  ["/api/comments", handleSocial],
  ["/api/feed", handleSocial],
  ["/api/social", handleSocial],
  ["/api/trending", handleSocial],
  ["/api/suggested", handleSocial],
  ["/api/activity", handleSocial],
  ["/api/ai/feed", handleSocial],
  ["/api/saved-posts", handleSocial],
  // content / info
  ["/api/news", handleContent],
  ["/api/elder-stories", handleContent],
  ["/api/oral-history", handleContent],
  ["/api/jobs", handleContent],
  ["/api/directory", handleContent],
  ["/api/environment", handleContent],
  ["/api/projects", handleContent],
  ["/api/genealogy", handleContent],
  ["/api/war-canoe", handleContent],
  ["/api/donations", handleContent],
  ["/api/mentorship", handleContent],
  ["/api/reports", handleContent],
  // misc (contact, newsletter, stories, analytics, etc.)
  ["/api/contact", handleMisc],
  ["/api/newsletter", handleMisc],
  ["/api/stories", handleMisc],
  ["/api/analytics", handleMisc],
  ["/api/health", handleMisc],
];

function matchModule(pathname) {
  for (const [prefix, handler] of MODULES) {
    if (pathname.startsWith(prefix)) return handler;
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") return handleOptions();

    // Real-time WebSocket -> ChatDurableObject
    if (pathname.startsWith("/api/chat/ws")) {
      const id = env.CHAT.idFromName("global");
      const stub = env.CHAT.get(id);
      return stub.fetch(request);
    }

    // Health check
    if (pathname === "/api/health" || pathname === "/api/health/") {
      return new Response(JSON.stringify({ status: "ok", service: "ke-kingdom-cf-worker" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const handler = matchModule(pathname);
    if (!handler) {
      return notFound(`No route for ${request.method} ${pathname}`);
    }

    try {
      const ctx = { url, env, request };
      return await handler(request, env, ctx);
    } catch (err) {
      console.error("Unhandled error:", err);
      return fail(500, "Internal server error");
    }
  },

  // Optional scheduled cleanup (e.g. delete expired tokens)
  async scheduled(_, env) {
    const expiry = Date.now();
    await env.DB.prepare("DELETE FROM tokens WHERE expires_at < ?").bind(expiry).run();
    console.log("Cleaned expired tokens");
  },
};

export { ChatDurableObject };
