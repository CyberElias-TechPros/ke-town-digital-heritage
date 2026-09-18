/**
 * Cloudflare Worker environment bindings.
 */
export interface Env {
  /** D1 SQLite database */
  DB: D1Database;
  /** R2 bucket for user media */
  MEDIA: R2Bucket;
  /** KV namespace: rate limits, cached counters, realtime pub/sub fallback */
  CACHE: KVNamespace;
  /** Durable Object used to fan out realtime events across isolates */
  REALTIME: DurableObjectNamespace;
  /** Static assets (built SPA) */
  ASSETS: Fetcher;

  JWT_SECRET?: string;
  JWT_TTL_SECONDS?: string;
  APP_NAME?: string;
  APP_URL?: string;
  UPLOAD_MAX_BYTES?: string;
  DEFAULT_CURRENCY?: string;
  ADMIN_EMAIL?: string;
  EXPOSE_RESET_TOKEN?: string;
  /** Set to "1" in local dev to let the e2e suite run back to back. */
  RATE_LIMIT_DISABLED?: string;
  /** Scales every limit up (e.g. "5") without disabling the guard. */
  RATE_LIMIT_MULTIPLIER?: string;

  CF_VERSION_METADATA?: unknown;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  username: string | null;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  avatar: string;
  bio: string;
  location: string;
  phone: string;
  coverImage: string;
  language: string;
  timezone: string;
  profileVisibility: string;
  allowMessages: boolean;
  showOnlineStatus: boolean;
  verified: boolean;
  isSeller: boolean;
  shopName: string;
  shopDescription: string;
  shopBanner: string;
  shopVerified: boolean;
  sellerRating: number;
  totalSales: number;
  balance: number;
  pendingBalance: number;
  interests: string[];
  skills: string[];
  followers: string[];
  following: string[];
  blockedUsers: string[];
  mutedUsers: string[];
  createdAt: string;
  lastLogin: string | null;
}

/** Anything JSON-safe we attach to a Hono context */
export interface CtxVars {
  env: Env;
  user: AuthUser | null;
}

/** Hono app shape shared by every route module. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    user?: AuthUser;
  };
};
