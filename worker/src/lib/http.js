// HTTP helpers for the Cloudflare Worker.
// Provides JSON responses, CORS, error handling and consistent response shape.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * JSON response with consistent shape.
 * Success body is sent as-is; errors are wrapped in { error: message }.
 */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/** Success response. */
export function ok(data, status = 200) {
  return json(data, status);
}

/** Error response — never leak internals to the client. */
export function fail(status, message, extra = {}) {
  const safeMessage =
    status >= 500 ? "An unexpected error occurred. Please try again." : message;
  return json({ error: safeMessage, ...extra }, status);
}

export function badRequest(message = "Bad request") {
  return fail(400, message);
}

export function unauthorized(message = "Authentication required") {
  return fail(401, message);
}

export function forbidden(message = "You do not have permission to do that") {
  return fail(403, message);
}

export function notFound(message = "Resource not found") {
  return fail(404, message);
}

/** Parse JSON body safely; returns null on invalid input. */
export async function parseBody(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** OPTIONS preflight handler. */
export function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Parse URL query params into a plain object. */
export function queryParams(url) {
  const params = {};
  for (const [key, value] of new URL(url).searchParams.entries()) {
    params[key] = value;
  }
  return params;
}

/** Extract bearer token from Authorization header. */
export function bearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
