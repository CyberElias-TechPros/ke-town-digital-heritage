// File upload routes — stores objects in Cloudflare R2.
// Public GET serves objects back from R2 so uploads work end-to-end.
import { ok, badRequest, unauthorized, notFound, fail } from "../lib/http.js";
import { requireUser } from "../lib/middleware.js";
import { newId } from "../lib/db.js";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime", "video/mov",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/m4a",
  "application/pdf", "text/plain", "application/json", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitize(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function handleUpload(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/upload/, "");
  const method = request.method;

  // GET /api/upload/:key — serve stored object from R2
  if (method === "GET" && path.startsWith("/")) {
    const key = decodeURIComponent(path.slice(1));
    if (!env.MEDIA) return notFound("Storage not configured");
    const object = await env.MEDIA.get(key);
    if (!object) return notFound("File not found");
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (method !== "POST") return badRequest("Method not allowed");

  const { user, error } = await requireUser(request, env);
  if (error) return error;

  const form = await request.formData();
  const files = [];
  const single = form.get("file");
  if (single && typeof single === "object" && single.name) files.push(single);
  const multiple = form.getAll("files");
  multiple.forEach((f) => f && f.name && files.push(f));
  if (!files.length) return badRequest("No file provided");

  const results = [];
  for (const file of files) {
    if (file.size > MAX_SIZE) {
      return badRequest(`File "${file.name}" exceeds the 10 MB limit`);
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return badRequest(`File type "${mime}" is not allowed`);
    }
    const key = `uploads/${newId()}-${sanitize(file.name)}`;
    if (env.MEDIA) {
      await env.MEDIA.put(key, file.stream(), {
        httpMetadata: { contentType: mime },
      });
    }
    const origin = new URL(request.url).origin;
    results.push({
      url: `${origin}/api/upload/${key}`,
      key,
      filename: file.name,
      size: file.size,
      mime,
    });
  }

  return ok(
    files.length > 1 ? { urls: results.map((r) => r.url), files: results } : { url: results[0].url, ...results[0] },
    201
  );
}
