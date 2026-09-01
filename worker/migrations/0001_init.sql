-- ============================================================
-- KE Kingdom Digital Heritage — D1 (SQLite) schema
-- Cloudflare Workers backend
--
-- Conventions:
--   * `id` is a 128-bit hex string generated app-side (crypto.randomUUID)
--   * `created_at` / `updated_at` are Unix epoch milliseconds (INTEGER)
--   * Flexible sub-documents are stored as JSON TEXT (parse on read)
--   * Foreign keys are enforced
-- ============================================================
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  username        TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'user',   -- user|moderator|content_manager|seller_manager|admin
  account_status  TEXT NOT NULL DEFAULT 'active', -- active|suspended|deactivated
  email_verified  INTEGER NOT NULL DEFAULT 0,
  avatar          TEXT,
  bio             TEXT,
  location        TEXT,
  is_seller       INTEGER NOT NULL DEFAULT 0,
  shop_name       TEXT,
  shop_verified   INTEGER NOT NULL DEFAULT 0,
  seller_rating   REAL,
  total_sales     INTEGER NOT NULL DEFAULT 0,
  profile_visibility TEXT NOT NULL DEFAULT 'public', -- public|followers|private
  allow_messages  INTEGER NOT NULL DEFAULT 1,
  show_online_status INTEGER NOT NULL DEFAULT 1,
  verified        INTEGER NOT NULL DEFAULT 0,
  followers       TEXT DEFAULT '[]',  -- JSON array of user ids
  following       TEXT DEFAULT '[]',  -- JSON array of user ids
  blocked_users   TEXT DEFAULT '[]',  -- JSON array of user ids
  muted_users     TEXT DEFAULT '[]',  -- JSON array of user ids
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ------------------------------------------------------------
-- AUTH TOKENS (password reset / email verification / refresh)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,       -- password_reset|email_verify|refresh
  token_hash  TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);

-- ------------------------------------------------------------
-- SOCIAL: POSTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  media       TEXT DEFAULT '[]',   -- JSON array of {type,url}
  location    TEXT,
  feeling     TEXT,
  privacy     TEXT NOT NULL DEFAULT 'public',
  visibility  TEXT NOT NULL DEFAULT 'public',
  group_id    TEXT,
  status      TEXT NOT NULL DEFAULT 'active', -- active|archived|reported|removed
  like_count  INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  saved_count INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_group ON posts(group_id);

-- ------------------------------------------------------------
-- REACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reactions (
  id          TEXT PRIMARY KEY,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'like',  -- like|love|laugh|sad|angry...
  created_at  INTEGER NOT NULL,
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);

-- ------------------------------------------------------------
-- COMMENTS (supports nested replies via parent_id)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,   -- post|event|product|story|gallery
  target_id   TEXT NOT NULL,
  parent_id   TEXT,            -- reply nesting
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

-- ------------------------------------------------------------
-- FOLLOWS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
  id           TEXT PRIMARY KEY,
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  UNIQUE(follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ------------------------------------------------------------
-- SAVED POSTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_posts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id)
);

-- ------------------------------------------------------------
-- ACTIVITY FEED
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,      -- post|comment|reaction|follow|group|event|product|order
  action       TEXT NOT NULL,      -- created|liked|commented|followed|joined...
  target_type  TEXT,
  target_id    TEXT,
  metadata     TEXT DEFAULT '{}',
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, created_at);

-- ------------------------------------------------------------
-- GROUPS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  creator_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  description TEXT,
  category    TEXT,
  avatar      TEXT,
  cover_image TEXT,
  visibility  TEXT NOT NULL DEFAULT 'public',  -- public|private
  member_count INTEGER NOT NULL DEFAULT 1,
  settings    TEXT DEFAULT '{}',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id          TEXT PRIMARY KEY,
  group_id    TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',  -- member|admin|moderator
  joined_at   INTEGER NOT NULL,
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);

-- ------------------------------------------------------------
-- EVENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  creator_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  slug        TEXT UNIQUE,
  category    TEXT,
  event_type  TEXT DEFAULT 'festival',   -- festival|cultural|community|workshop
  start_date  TEXT,
  end_date    TEXT,
  timezone    TEXT,
  location    TEXT,
  venue       TEXT,
  cover_image TEXT,
  capacity    INTEGER,
  status      TEXT NOT NULL DEFAULT 'published', -- draft|published|cancelled|archived
  visibility  TEXT NOT NULL DEFAULT 'public',
  attendee_count INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'going', -- going|interested|declined
  created_at INTEGER NOT NULL,
  UNIQUE(event_id, user_id)
);

-- ------------------------------------------------------------
-- GALLERY
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_items (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT,
  description TEXT,
  category    TEXT,
  media_type  TEXT NOT NULL DEFAULT 'image', -- image|video|audio|document
  media_url   TEXT NOT NULL,
  thumbnail   TEXT,
  approved    INTEGER NOT NULL DEFAULT 0,
  featured    INTEGER NOT NULL DEFAULT 0,
  like_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_items(category, approved);

-- ------------------------------------------------------------
-- MARKETPLACE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  seller_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  condition   TEXT,
  price       REAL NOT NULL DEFAULT 0,
  negotiable  INTEGER NOT NULL DEFAULT 0,
  images      TEXT DEFAULT '[]',
  video       TEXT,
  brand       TEXT,
  model       TEXT,
  location    TEXT,
  contact     TEXT,
  tags        TEXT DEFAULT '[]',
  quantity    INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'active', -- active|sold|archived|pending
  like_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, status);

CREATE TABLE IF NOT EXISTS product_likes (
  id         TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(product_id, user_id)
);

-- ------------------------------------------------------------
-- CART
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, product_id)
);

-- ------------------------------------------------------------
-- ADDRESSES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  phone      TEXT,
  address    TEXT NOT NULL,
  city       TEXT,
  state      TEXT,
  country    TEXT DEFAULT 'Nigeria',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|processing|shipped|delivered|cancelled
  items            TEXT DEFAULT '[]',
  subtotal         REAL NOT NULL DEFAULT 0,
  delivery_fee     REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL DEFAULT 0,
  address_id       TEXT,
  delivery_method  TEXT,
  payment_method   TEXT,
  payment_reference TEXT,
  notes            TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,   -- product|seller|event|post
  target_id   TEXT NOT NULL,
  rating      INTEGER NOT NULL,
  content     TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE(reviewer_id, target_type, target_id)
);

-- ------------------------------------------------------------
-- MESSAGES (REST + Durable Object persistence)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id           TEXT PRIMARY KEY,
  participants TEXT NOT NULL DEFAULT '[]',   -- JSON [{_id, fullName, avatar}]
  participant_ids TEXT NOT NULL DEFAULT '[]', -- JSON [userId, ...]
  last_message TEXT,
  unread_count TEXT DEFAULT '{}',            -- JSON {userId: count}
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name     TEXT,
  sender_avatar   TEXT,
  content         TEXT NOT NULL DEFAULT '',
  media           TEXT DEFAULT '[]',
  read_at         INTEGER,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT,
  body        TEXT,
  link        TEXT,
  metadata    TEXT DEFAULT '{}',
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at);

-- ------------------------------------------------------------
-- CONTENT / INFORMATION ENTITIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        TEXT UNIQUE,
  excerpt     TEXT,
  content     TEXT,
  cover_image TEXT,
  category    TEXT,
  tags        TEXT DEFAULT '[]',
  published   INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'published',
  like_count  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_at);

CREATE TABLE IF NOT EXISTS elder_stories (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  elder_name  TEXT,
  content     TEXT,
  media       TEXT DEFAULT '[]',
  approved    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS oral_histories (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  language    TEXT,
  category    TEXT,
  content     TEXT,
  media       TEXT DEFAULT '[]',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS directory_members (
  id          TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  business    TEXT,
  category    TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  website     TEXT,
  description TEXT,
  approved    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS environment_reports (
  id          TEXT PRIMARY KEY,
  author_id   TEXT,
  title       TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  media       TEXT DEFAULT '[]',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ongoing', -- ongoing|completed|proposed
  updates     TEXT DEFAULT '[]',
  cover_image TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT,   -- full-time|part-time|contract|volunteer
  category    TEXT,
  company     TEXT,
  location    TEXT,
  description TEXT,
  requirements TEXT DEFAULT '[]',
  salary      TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- ------------------------------------------------------------
-- MISC / ENGAGEMENT
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT,
  message     TEXT NOT NULL,
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  subscribed INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT,
  target_type TEXT,
  target_id   TEXT,
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id TEXT,
  metadata    TEXT DEFAULT '{}',
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id, created_at);
