-- reconcile-prod.sql: ONE-SHOT bridge for production databases at the
-- 0001_initial..0004_soft_deletes generation, bringing them to the schema
-- the worker code expects (0001_schema generation).
--
-- APPLY WITH: wrangler d1 execute ke-town-db --remote --file=reconcile-prod.sql
-- DO NOT place in migrations/ : `migrations apply` ordering (0001 indexes
-- reference not-yet-added columns) and fresh databases (ALTERs assume the
-- old tables exist) both break under the journal. This file is idempotent
-- (IF NOT EXISTS creates) except the ALTERs, which succeed exactly once
-- against the old generation.
--   * creates tables missing in prod (exact definitions)
--   * adds columns missing on shared tables (NULLABLE-adjusted so the
--     migration succeeds on tables that already hold rows)
--   * legacy-only tables (gallery, genealogy_trees, mentorship, payments,
--     reactions) are intentionally left untouched, as are column types
--     (SQLite type affinity tolerates TEXT/INTEGER overlap at runtime).

-- ---------- new table: activities ----------
CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  message     TEXT DEFAULT '',
  data        TEXT DEFAULT '{}',
  visibility  TEXT NOT NULL DEFAULT 'public',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: addresses ----------
CREATE TABLE IF NOT EXISTS addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  address    TEXT NOT NULL,
  city       TEXT DEFAULT '',
  state      TEXT DEFAULT '',
  country    TEXT DEFAULT 'Nigeria',
  postal     TEXT DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: analytics_events ----------
CREATE TABLE IF NOT EXISTS analytics_events (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  event_type  TEXT NOT NULL,
  entity_type TEXT DEFAULT '',
  entity_id   TEXT DEFAULT '',
  session_id  TEXT DEFAULT '',
  referrer    TEXT DEFAULT '',
  country     TEXT DEFAULT '',
  device      TEXT DEFAULT '',
  value       REAL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: audit_logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id TEXT,
  details     TEXT DEFAULT '{}',
  ip          TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: blocks ----------
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id   TEXT NOT NULL,
  blocked_id   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- ---------- new table: campaigns ----------
CREATE TABLE IF NOT EXISTS campaigns (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  goal_amount REAL NOT NULL DEFAULT 0,
  raised_amount REAL NOT NULL DEFAULT 0,
  currency    TEXT DEFAULT 'NGN',
  category    TEXT DEFAULT 'community',
  deadline    TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: cart_items ----------
CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, product_id)
);

-- ---------- new table: comments ----------
CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL,
  content     TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'post',
  target_id   TEXT NOT NULL,
  parent_id   TEXT,
  like_count  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: contact_messages ----------
CREATE TABLE IF NOT EXISTS contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT DEFAULT '',
  message     TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  read        INTEGER NOT NULL DEFAULT 0,
  replied     INTEGER NOT NULL DEFAULT 0,
  ip          TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: conversations ----------
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  participants  TEXT NOT NULL DEFAULT '[]',
  type          TEXT NOT NULL DEFAULT 'direct',
  group_id      TEXT,
  title         TEXT DEFAULT '',
  last_message  TEXT DEFAULT '',
  last_message_at TEXT,
  unread        TEXT DEFAULT '{}',
  archived      TEXT DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: directory_members ----------
CREATE TABLE IF NOT EXISTS directory_members (
  id          TEXT PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT DEFAULT '',
  phone       TEXT DEFAULT '',
  profession  TEXT DEFAULT '',
  category    TEXT DEFAULT 'general',
  country     TEXT DEFAULT '',
  city        TEXT DEFAULT '',
  bio         TEXT DEFAULT '',
  avatar      TEXT DEFAULT '',
  website     TEXT DEFAULT '',
  linkedin    TEXT DEFAULT '',
  willing_to_mentor INTEGER NOT NULL DEFAULT 0,
  approved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: donations ----------
CREATE TABLE IF NOT EXISTS donations (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,
  donor_name  TEXT DEFAULT '',
  donor_email TEXT DEFAULT '',
  user_id     TEXT,
  amount      REAL NOT NULL DEFAULT 0,
  currency    TEXT DEFAULT 'NGN',
  campaign_id TEXT,
  project_id  TEXT,
  message     TEXT DEFAULT '',
  anonymous   INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',
  channel     TEXT DEFAULT 'paystack',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: elder_stories ----------
CREATE TABLE IF NOT EXISTS elder_stories (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  elder_name  TEXT NOT NULL DEFAULT '',
  elder_avatar TEXT DEFAULT '',
  age         INTEGER,
  community   TEXT DEFAULT '',
  excerpt     TEXT DEFAULT '',
  content     TEXT DEFAULT '',
  audio_url   TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  category    TEXT DEFAULT 'memoir',
  language    TEXT DEFAULT 'English',
  tags        TEXT DEFAULT '[]',
  author_id   TEXT,
  views       INTEGER NOT NULL DEFAULT 0,
  featured    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'published',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: environment_reports ----------
CREATE TABLE IF NOT EXISTS environment_reports (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  category    TEXT DEFAULT 'waste',
  severity    TEXT DEFAULT 'medium',
  location_name TEXT DEFAULT '',
  latitude    REAL,
  longitude   REAL,
  images      TEXT DEFAULT '[]',
  reporter_id TEXT,
  reporter_name TEXT DEFAULT 'Anonymous',
  status      TEXT NOT NULL DEFAULT 'open',
  upvotes     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: event_rsvps ----------
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'going',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);

-- ---------- new table: events ----------
CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  cover_image   TEXT DEFAULT '',
  category      TEXT DEFAULT 'community',
  event_type    TEXT DEFAULT 'in_person',
  location_name TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  latitude      REAL,
  longitude     REAL,
  online_link   TEXT DEFAULT '',
  start_date    TEXT NOT NULL,
  end_date      TEXT,
  timezone      TEXT DEFAULT 'Africa/Lagos',
  organizer_id  TEXT NOT NULL,
  group_id      TEXT,
  capacity      INTEGER DEFAULT 0,
  price         REAL NOT NULL DEFAULT 0,
  currency      TEXT DEFAULT 'NGN',
  tags          TEXT DEFAULT '[]',
  rsvp_count    INTEGER NOT NULL DEFAULT 0,
  view_count    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'approved',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: family_members ----------
CREATE TABLE IF NOT EXISTS family_members (
  id           TEXT PRIMARY KEY,
  tree_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  gender       TEXT DEFAULT 'unknown',
  birth_year   INTEGER,
  death_year   INTEGER,
  is_living    INTEGER NOT NULL DEFAULT 1,
  generation   INTEGER NOT NULL DEFAULT 0,
  parent_id    TEXT,
  spouse_id    TEXT,
  house_id     TEXT,
  photo        TEXT DEFAULT '',
  notes        TEXT DEFAULT '',
  birth_place  TEXT DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: family_relationships ----------
CREATE TABLE IF NOT EXISTS family_relationships (
  id          TEXT PRIMARY KEY,
  tree_id     TEXT NOT NULL,
  from_id     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  relation    TEXT NOT NULL DEFAULT 'child_of',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: family_trees ----------
CREATE TABLE IF NOT EXISTS family_trees (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  house_id    TEXT,
  visibility  TEXT NOT NULL DEFAULT 'private',
  root_id     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: festivals ----------
CREATE TABLE IF NOT EXISTS festivals (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  month       INTEGER NOT NULL,
  day         INTEGER NOT NULL,
  year        INTEGER,
  category    TEXT DEFAULT 'cultural',
  location_name TEXT DEFAULT '',
  image       TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: follows ----------
CREATE TABLE IF NOT EXISTS follows (
  follower_id   TEXT NOT NULL,
  following_id  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id)
);

-- ---------- new table: gallery_items ----------
CREATE TABLE IF NOT EXISTS gallery_items (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  media_type  TEXT NOT NULL DEFAULT 'image',
  thumbnail   TEXT DEFAULT '',
  category    TEXT DEFAULT 'culture',
  tags        TEXT DEFAULT '[]',
  uploader_id TEXT,
  credit      TEXT DEFAULT '',
  approved    INTEGER NOT NULL DEFAULT 1,
  featured    INTEGER NOT NULL DEFAULT 0,
  views       INTEGER NOT NULL DEFAULT 0,
  likes       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: group_members ----------
CREATE TABLE IF NOT EXISTS group_members (
  group_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, user_id)
);

-- ---------- new table: groups ----------
CREATE TABLE IF NOT EXISTS groups (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT,
  description   TEXT DEFAULT '',
  cover_image   TEXT DEFAULT '',
  avatar        TEXT DEFAULT '',
  privacy       TEXT NOT NULL DEFAULT 'public',
  category      TEXT DEFAULT 'general',
  join_method   TEXT DEFAULT 'open',
  creator_id    TEXT NOT NULL,
  member_count  INTEGER NOT NULL DEFAULT 1,
  post_count    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: job_applications ----------
CREATE TABLE IF NOT EXISTS job_applications (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  cover_letter TEXT DEFAULT '',
  resume_url  TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (job_id, user_id)
);

-- ---------- new table: jobs ----------
CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  company       TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  requirements  TEXT DEFAULT '[]',
  responsibilities TEXT DEFAULT '[]',
  category      TEXT DEFAULT 'technology',
  job_type      TEXT DEFAULT 'full_time',
  location_name TEXT DEFAULT '',
  remote        INTEGER NOT NULL DEFAULT 0,
  salary_min    REAL,
  salary_max    REAL,
  currency      TEXT DEFAULT 'NGN',
  poster_id     TEXT,
  contact_email TEXT DEFAULT '',
  deadline      TEXT,
  views         INTEGER NOT NULL DEFAULT 0,
  applications  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: media ----------
CREATE TABLE IF NOT EXISTS media (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT,
  key         TEXT NOT NULL,
  url         TEXT NOT NULL,
  filename    TEXT DEFAULT '',
  mime_type   TEXT DEFAULT '',
  size        INTEGER NOT NULL DEFAULT 0,
  kind        TEXT DEFAULT 'image',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: mentor_profiles ----------
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE,
  skills      TEXT DEFAULT '[]',
  expertise   TEXT DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0,
  bio         TEXT DEFAULT '',
  availability TEXT DEFAULT 'weekends',
  languages   TEXT DEFAULT '["English"]',
  hourly_rate REAL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  rating      REAL NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: mentorship_requests ----------
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id          TEXT PRIMARY KEY,
  mentor_id   TEXT NOT NULL,
  mentee_id   TEXT NOT NULL,
  note        TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: messages ----------
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id       TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  media           TEXT NOT NULL DEFAULT '[]',
  read_by         TEXT NOT NULL DEFAULT '[]',
  deleted_for     TEXT NOT NULL DEFAULT '[]',
  reply_to        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: news ----------
CREATE TABLE IF NOT EXISTS news (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  slug        TEXT,
  excerpt     TEXT DEFAULT '',
  content     TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  category    TEXT DEFAULT 'community',
  tags        TEXT DEFAULT '[]',
  author_id   TEXT,
  author_name TEXT DEFAULT 'KE Town Editorial',
  views       INTEGER NOT NULL DEFAULT 0,
  featured    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'published',
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: newsletter_subscribers ----------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  interests   TEXT DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'subscribed',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  from_id     TEXT,
  type        TEXT NOT NULL DEFAULT 'system',
  title       TEXT DEFAULT '',
  message     TEXT NOT NULL DEFAULT '',
  link        TEXT,
  data        TEXT DEFAULT '{}',
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: oral_histories ----------
CREATE TABLE IF NOT EXISTS oral_histories (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  narrator    TEXT DEFAULT '',
  narrator_id TEXT,
  category    TEXT DEFAULT 'heritage',
  language    TEXT DEFAULT 'Kalabari',
  transcript  TEXT DEFAULT '',
  audio_url   TEXT DEFAULT '',
  video_url   TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  duration    INTEGER DEFAULT 0,
  location_name TEXT DEFAULT '',
  recorded_at TEXT,
  tags        TEXT DEFAULT '[]',
  approved    INTEGER NOT NULL DEFAULT 1,
  views       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: order_items ----------
CREATE TABLE IF NOT EXISTS order_items (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  seller_id   TEXT NOT NULL,
  title       TEXT NOT NULL,
  image       TEXT DEFAULT '',
  unit_price  REAL NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 1,
  total       REAL NOT NULL DEFAULT 0
);

-- ---------- new table: orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  reference        TEXT NOT NULL UNIQUE,
  buyer_id         TEXT NOT NULL,
  seller_id        TEXT,
  items            TEXT NOT NULL DEFAULT '[]',
  subtotal         REAL NOT NULL DEFAULT 0,
  shipping_fee     REAL NOT NULL DEFAULT 0,
  service_fee      REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL DEFAULT 0,
  currency         TEXT DEFAULT 'NGN',
  payment_method   TEXT DEFAULT 'transfer',
  payment_status   TEXT NOT NULL DEFAULT 'pending',
  order_status     TEXT NOT NULL DEFAULT 'pending',
  delivery_method  TEXT DEFAULT 'pickup',
  shipping_address TEXT DEFAULT '{}',
  tracking         TEXT DEFAULT '',
  note             TEXT DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: password_resets ----------
CREATE TABLE IF NOT EXISTS password_resets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: payment_methods ----------
CREATE TABLE IF NOT EXISTS payment_methods (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'bank',
  label       TEXT NOT NULL DEFAULT '',
  bank_name   TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  last4       TEXT DEFAULT '',
  brand       TEXT DEFAULT '',
  expiry      TEXT DEFAULT '',
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: petition_signatures ----------
CREATE TABLE IF NOT EXISTS petition_signatures (
  petition_id TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  comment     TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (petition_id, user_id)
);

-- ---------- new table: petitions ----------
CREATE TABLE IF NOT EXISTS petitions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  target      TEXT DEFAULT '',
  author_id   TEXT,
  cover_image TEXT DEFAULT '',
  goal        INTEGER NOT NULL DEFAULT 100,
  signature_count INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: phrases ----------
CREATE TABLE IF NOT EXISTS phrases (
  id          TEXT PRIMARY KEY,
  phrase      TEXT NOT NULL,
  translation TEXT NOT NULL,
  language    TEXT DEFAULT 'Kalabari',
  category    TEXT DEFAULT 'greetings',
  audio_url   TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: poll_votes ----------
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  option_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (poll_id, user_id, option_key)
);

-- ---------- new table: polls ----------
CREATE TABLE IF NOT EXISTS polls (
  id          TEXT PRIMARY KEY,
  question    TEXT NOT NULL,
  options     TEXT NOT NULL DEFAULT '[]',
  author_id   TEXT,
  category    TEXT DEFAULT 'community',
  multiple    INTEGER NOT NULL DEFAULT 0,
  closes_at   TEXT,
  total_votes INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: post_reactions ----------
CREATE TABLE IF NOT EXISTS post_reactions (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (post_id, user_id)
);

-- ---------- new table: posts ----------
CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  author_id     TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  media         TEXT NOT NULL DEFAULT '[]',
  location      TEXT,
  feeling       TEXT DEFAULT '',
  privacy       TEXT NOT NULL DEFAULT 'community',
  visibility    TEXT NOT NULL DEFAULT 'community',
  group_id      TEXT,
  is_pinned     INTEGER NOT NULL DEFAULT 0,
  view_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  share_count   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: product_likes ----------
CREATE TABLE IF NOT EXISTS product_likes (
  product_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product_id, user_id)
);

-- ---------- new table: products ----------
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  seller_id     TEXT NOT NULL,
  shop_id       TEXT,
  title         TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  category      TEXT DEFAULT 'crafts',
  subcategory   TEXT DEFAULT '',
  condition     TEXT DEFAULT 'new',
  price         REAL NOT NULL DEFAULT 0,
  currency      TEXT DEFAULT 'NGN',
  is_negotiable INTEGER NOT NULL DEFAULT 0,
  images        TEXT NOT NULL DEFAULT '[]',
  video         TEXT DEFAULT '',
  brand         TEXT DEFAULT '',
  model         TEXT DEFAULT '',
  artisan_name  TEXT DEFAULT '',
  location_name TEXT DEFAULT '',
  location      TEXT DEFAULT '{}',
  contact       TEXT DEFAULT '',
  tags          TEXT NOT NULL DEFAULT '[]',
  stock         INTEGER NOT NULL DEFAULT 1,
  quantity      INTEGER NOT NULL DEFAULT 1,
  views         INTEGER NOT NULL DEFAULT 0,
  likes         INTEGER NOT NULL DEFAULT 0,
  is_featured   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: project_updates ----------
CREATE TABLE IF NOT EXISTS project_updates (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  text        TEXT NOT NULL,
  author_id   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: projects ----------
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  category    TEXT DEFAULT 'infrastructure',
  cover_image TEXT DEFAULT '',
  goal_amount REAL NOT NULL DEFAULT 0,
  raised_amount REAL NOT NULL DEFAULT 0,
  currency    TEXT DEFAULT 'NGN',
  target_date TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  progress    INTEGER NOT NULL DEFAULT 0,
  supporters  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: recommendation_events ----------
CREATE TABLE IF NOT EXISTS recommendation_events (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL,
  recommendation_id  TEXT NOT NULL,
  entity_type        TEXT DEFAULT '',
  action             TEXT NOT NULL DEFAULT 'impression',
  feedback           TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: reports ----------
CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT 'other',
  details     TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT,
  resolution  TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- ---------- new table: reviews ----------
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  author_id   TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'product',
  target_id   TEXT NOT NULL,
  rating      INTEGER NOT NULL DEFAULT 5,
  title       TEXT DEFAULT '',
  body        TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'approved',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (author_id, target_type, target_id)
);

-- ---------- new table: saved_posts ----------
CREATE TABLE IF NOT EXISTS saved_posts (
  user_id     TEXT NOT NULL,
  post_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, post_id)
);

-- ---------- new table: shops ----------
CREATE TABLE IF NOT EXISTS shops (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  slug          TEXT,
  description   TEXT DEFAULT '',
  banner        TEXT DEFAULT '',
  logo          TEXT DEFAULT '',
  location      TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  verified      INTEGER NOT NULL DEFAULT 0,
  rating        REAL NOT NULL DEFAULT 0,
  total_sales   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: stories ----------
CREATE TABLE IF NOT EXISTS stories (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  era         TEXT DEFAULT '',
  category    TEXT DEFAULT 'history',
  cover_image TEXT DEFAULT '',
  author_id   TEXT,
  views       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: transactions ----------
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  reference   TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'payment',
  direction   TEXT NOT NULL DEFAULT 'debit',
  amount      REAL NOT NULL DEFAULT 0,
  currency    TEXT DEFAULT 'NGN',
  status      TEXT NOT NULL DEFAULT 'success',
  method      TEXT DEFAULT '',
  description TEXT DEFAULT '',
  meta        TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: users ----------
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username              TEXT UNIQUE COLLATE NOCASE,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'user',
  account_status        TEXT NOT NULL DEFAULT 'active',
  email_verified        INTEGER NOT NULL DEFAULT 0,
  email_verify_token    TEXT,
  avatar                TEXT DEFAULT '',
  cover_image           TEXT DEFAULT '',
  bio                   TEXT DEFAULT '',
  location              TEXT DEFAULT '',
  phone                 TEXT DEFAULT '',
  language              TEXT DEFAULT 'en',
  timezone              TEXT DEFAULT 'Africa/Lagos',
  profile_visibility    TEXT NOT NULL DEFAULT 'public',
  allow_messages        INTEGER NOT NULL DEFAULT 1,
  show_online_status    INTEGER NOT NULL DEFAULT 1,
  verified              INTEGER NOT NULL DEFAULT 0,
  is_seller             INTEGER NOT NULL DEFAULT 0,
  shop_name             TEXT DEFAULT '',
  shop_description      TEXT DEFAULT '',
  shop_banner           TEXT DEFAULT '',
  shop_verified         INTEGER NOT NULL DEFAULT 0,
  seller_rating         REAL NOT NULL DEFAULT 0,
  total_sales           INTEGER NOT NULL DEFAULT 0,
  balance               REAL NOT NULL DEFAULT 0,
  pending_balance       REAL NOT NULL DEFAULT 0,
  status_text           TEXT DEFAULT 'online',
  last_seen             TEXT,
  last_login            TEXT,
  login_attempts        INTEGER NOT NULL DEFAULT 0,
  locked_until          TEXT,
  interests             TEXT DEFAULT '[]',
  skills                TEXT DEFAULT '[]',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: volunteer_applications ----------
CREATE TABLE IF NOT EXISTS volunteer_applications (
  id          TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  motivation  TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (opportunity_id, user_id)
);

-- ---------- new table: volunteer_opportunities ----------
CREATE TABLE IF NOT EXISTS volunteer_opportunities (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  category    TEXT DEFAULT 'community',
  location_name TEXT DEFAULT '',
  commitment  TEXT DEFAULT 'flexible',
  spots       INTEGER DEFAULT 0,
  filled      INTEGER NOT NULL DEFAULT 0,
  start_date  TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: war_canoe_houses ----------
CREATE TABLE IF NOT EXISTS war_canoe_houses (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  community   TEXT DEFAULT '',
  founder     TEXT DEFAULT '',
  founded_year INTEGER,
  description TEXT DEFAULT '',
  image       TEXT DEFAULT '',
  lineage     TEXT DEFAULT '[]',
  current_chief TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- new table: withdrawals ----------
CREATE TABLE IF NOT EXISTS withdrawals (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  amount      REAL NOT NULL,
  currency    TEXT DEFAULT 'NGN',
  method      TEXT DEFAULT 'bank',
  bank_name   TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  note        TEXT DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

