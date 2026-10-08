-- reconcile-prod.sql: ONE-SHOT bridge for production databases at the
-- 0001_initial..0004_soft_deletes generation, bringing them to the schema
-- the worker code expects (0001_schema generation).
--
-- APPLY WITH: wrangler d1 execute ke-town-db --remote --file=reconcile-prod.sql
-- DO NOT place in migrations/ : see header notes in repo if curious.
-- This file is idempotent for CREATEs (IF NOT EXISTS); the ALTERs succeed
-- exactly once against the old generation (plus messages.read_at).
--   * creates tables missing in prod (exact definitions)
--   * adds columns missing on shared tables (NULLABLE-adjusted)
--   * legacy-only tables (gallery, genealogy_trees, mentorship, payments,
--     reactions) are intentionally left untouched, as are column types.

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

-- ---------- new table: blocks ----------
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id   TEXT NOT NULL,
  blocked_id   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id)
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

-- ---------- new table: event_rsvps ----------
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id   TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'going',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
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

-- ---------- new table: post_reactions ----------
CREATE TABLE IF NOT EXISTS post_reactions (
  id            TEXT PRIMARY KEY,
  post_id       TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (post_id, user_id)
);

-- ---------- new table: product_likes ----------
CREATE TABLE IF NOT EXISTS product_likes (
  product_id TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (product_id, user_id)
);

-- ---------- new table: project_updates ----------
CREATE TABLE IF NOT EXISTS project_updates (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  text        TEXT NOT NULL,
  author_id   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
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

-- ---------- reconcile: audit_logs ----------
ALTER TABLE audit_logs ADD COLUMN user_id TEXT;
ALTER TABLE audit_logs ADD COLUMN ip TEXT;

-- ---------- reconcile: campaigns ----------
ALTER TABLE campaigns ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE campaigns ADD COLUMN goal_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN raised_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE campaigns ADD COLUMN category TEXT DEFAULT 'community';
ALTER TABLE campaigns ADD COLUMN deadline TEXT;
ALTER TABLE campaigns ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- ---------- reconcile: comments ----------
ALTER TABLE comments ADD COLUMN author_id TEXT;
ALTER TABLE comments ADD COLUMN parent_id TEXT;
ALTER TABLE comments ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- ---------- reconcile: conversations ----------
ALTER TABLE conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE conversations ADD COLUMN group_id TEXT;
ALTER TABLE conversations ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE conversations ADD COLUMN unread TEXT DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN archived TEXT DEFAULT '[]';

-- ---------- reconcile: directory_members ----------
ALTER TABLE directory_members ADD COLUMN profession TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN category TEXT DEFAULT 'general';
ALTER TABLE directory_members ADD COLUMN country TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN city TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN avatar TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN website TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN linkedin TEXT DEFAULT '';
ALTER TABLE directory_members ADD COLUMN willing_to_mentor INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: donations ----------
ALTER TABLE donations ADD COLUMN user_id TEXT;
ALTER TABLE donations ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE donations ADD COLUMN campaign_id TEXT;
ALTER TABLE donations ADD COLUMN message TEXT DEFAULT '';
ALTER TABLE donations ADD COLUMN anonymous INTEGER NOT NULL DEFAULT 0;
ALTER TABLE donations ADD COLUMN channel TEXT DEFAULT 'paystack';

-- ---------- reconcile: elder_stories ----------
ALTER TABLE elder_stories ADD COLUMN elder_name TEXT NOT NULL DEFAULT '';
ALTER TABLE elder_stories ADD COLUMN elder_avatar TEXT DEFAULT '';
ALTER TABLE elder_stories ADD COLUMN age INTEGER;
ALTER TABLE elder_stories ADD COLUMN community TEXT DEFAULT '';
ALTER TABLE elder_stories ADD COLUMN excerpt TEXT DEFAULT '';
ALTER TABLE elder_stories ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE elder_stories ADD COLUMN category TEXT DEFAULT 'memoir';
ALTER TABLE elder_stories ADD COLUMN language TEXT DEFAULT 'English';
ALTER TABLE elder_stories ADD COLUMN tags TEXT DEFAULT '[]';
ALTER TABLE elder_stories ADD COLUMN author_id TEXT;
ALTER TABLE elder_stories ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE elder_stories ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE elder_stories ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE elder_stories ADD COLUMN updated_at TEXT;

-- ---------- reconcile: environment_reports ----------
ALTER TABLE environment_reports ADD COLUMN severity TEXT DEFAULT 'medium';
ALTER TABLE environment_reports ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE environment_reports ADD COLUMN latitude REAL;
ALTER TABLE environment_reports ADD COLUMN longitude REAL;
ALTER TABLE environment_reports ADD COLUMN images TEXT DEFAULT '[]';
ALTER TABLE environment_reports ADD COLUMN reporter_id TEXT;
ALTER TABLE environment_reports ADD COLUMN reporter_name TEXT DEFAULT 'Anonymous';
ALTER TABLE environment_reports ADD COLUMN status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE environment_reports ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: events ----------
ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'in_person';
ALTER TABLE events ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN address TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN latitude REAL;
ALTER TABLE events ADD COLUMN longitude REAL;
ALTER TABLE events ADD COLUMN online_link TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN start_date TEXT;
ALTER TABLE events ADD COLUMN timezone TEXT DEFAULT 'Africa/Lagos';
ALTER TABLE events ADD COLUMN organizer_id TEXT;
ALTER TABLE events ADD COLUMN group_id TEXT;
ALTER TABLE events ADD COLUMN capacity INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN price REAL NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE events ADD COLUMN tags TEXT DEFAULT '[]';
ALTER TABLE events ADD COLUMN rsvp_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: groups ----------
ALTER TABLE groups ADD COLUMN slug TEXT;
ALTER TABLE groups ADD COLUMN avatar TEXT DEFAULT '';
ALTER TABLE groups ADD COLUMN creator_id TEXT;
ALTER TABLE groups ADD COLUMN post_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE groups ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- ---------- reconcile: jobs ----------
ALTER TABLE jobs ADD COLUMN requirements TEXT DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN responsibilities TEXT DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN job_type TEXT DEFAULT 'full_time';
ALTER TABLE jobs ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE jobs ADD COLUMN remote INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN salary_min REAL;
ALTER TABLE jobs ADD COLUMN salary_max REAL;
ALTER TABLE jobs ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE jobs ADD COLUMN poster_id TEXT;
ALTER TABLE jobs ADD COLUMN contact_email TEXT DEFAULT '';
ALTER TABLE jobs ADD COLUMN deadline TEXT;
ALTER TABLE jobs ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN applications INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: messages ----------
ALTER TABLE messages ADD COLUMN media TEXT NOT NULL DEFAULT '[]';
ALTER TABLE messages ADD COLUMN read_by TEXT NOT NULL DEFAULT '[]';
ALTER TABLE messages ADD COLUMN deleted_for TEXT NOT NULL DEFAULT '[]';
ALTER TABLE messages ADD COLUMN reply_to TEXT;

-- ---------- reconcile: news ----------
ALTER TABLE news ADD COLUMN slug TEXT;
ALTER TABLE news ADD COLUMN excerpt TEXT DEFAULT '';
ALTER TABLE news ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE news ADD COLUMN tags TEXT DEFAULT '[]';
ALTER TABLE news ADD COLUMN author_id TEXT;
ALTER TABLE news ADD COLUMN author_name TEXT DEFAULT 'KE Town Editorial';
ALTER TABLE news ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN published_at TEXT;

-- ---------- reconcile: newsletter_subscribers ----------
ALTER TABLE newsletter_subscribers ADD COLUMN interests TEXT DEFAULT '[]';
ALTER TABLE newsletter_subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'subscribed';
ALTER TABLE newsletter_subscribers ADD COLUMN created_at TEXT;

-- ---------- reconcile: notifications ----------
ALTER TABLE notifications ADD COLUMN from_id TEXT;
ALTER TABLE notifications ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN data TEXT DEFAULT '{}';

-- ---------- reconcile: oral_histories ----------
ALTER TABLE oral_histories ADD COLUMN narrator TEXT DEFAULT '';
ALTER TABLE oral_histories ADD COLUMN narrator_id TEXT;
ALTER TABLE oral_histories ADD COLUMN transcript TEXT DEFAULT '';
ALTER TABLE oral_histories ADD COLUMN video_url TEXT DEFAULT '';
ALTER TABLE oral_histories ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE oral_histories ADD COLUMN duration INTEGER DEFAULT 0;
ALTER TABLE oral_histories ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE oral_histories ADD COLUMN recorded_at TEXT;
ALTER TABLE oral_histories ADD COLUMN tags TEXT DEFAULT '[]';
ALTER TABLE oral_histories ADD COLUMN approved INTEGER NOT NULL DEFAULT 1;
ALTER TABLE oral_histories ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: orders ----------
ALTER TABLE orders ADD COLUMN reference TEXT;
ALTER TABLE orders ADD COLUMN buyer_id TEXT;
ALTER TABLE orders ADD COLUMN seller_id TEXT;
ALTER TABLE orders ADD COLUMN service_fee REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'transfer';
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN order_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN tracking TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN note TEXT DEFAULT '';

-- ---------- reconcile: petitions ----------
ALTER TABLE petitions ADD COLUMN target TEXT DEFAULT '';
ALTER TABLE petitions ADD COLUMN author_id TEXT;
ALTER TABLE petitions ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE petitions ADD COLUMN goal INTEGER NOT NULL DEFAULT 100;
ALTER TABLE petitions ADD COLUMN signature_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE petitions ADD COLUMN status TEXT NOT NULL DEFAULT 'open';

-- ---------- reconcile: polls ----------
ALTER TABLE polls ADD COLUMN author_id TEXT;
ALTER TABLE polls ADD COLUMN category TEXT DEFAULT 'community';
ALTER TABLE polls ADD COLUMN multiple INTEGER NOT NULL DEFAULT 0;
ALTER TABLE polls ADD COLUMN closes_at TEXT;
ALTER TABLE polls ADD COLUMN total_votes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE polls ADD COLUMN status TEXT NOT NULL DEFAULT 'open';

-- ---------- reconcile: posts ----------
ALTER TABLE posts ADD COLUMN author_id TEXT;
ALTER TABLE posts ADD COLUMN group_id TEXT;
ALTER TABLE posts ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- ---------- reconcile: products ----------
ALTER TABLE products ADD COLUMN seller_id TEXT;
ALTER TABLE products ADD COLUMN shop_id TEXT;
ALTER TABLE products ADD COLUMN name TEXT;
ALTER TABLE products ADD COLUMN subcategory TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE products ADD COLUMN is_negotiable INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN artisan_name TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 1;

-- ---------- reconcile: projects ----------
ALTER TABLE projects ADD COLUMN category TEXT DEFAULT 'infrastructure';
ALTER TABLE projects ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN goal_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN raised_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN currency TEXT DEFAULT 'NGN';
ALTER TABLE projects ADD COLUMN target_date TEXT;
ALTER TABLE projects ADD COLUMN progress INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN supporters INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: reports ----------
ALTER TABLE reports ADD COLUMN details TEXT DEFAULT '';
ALTER TABLE reports ADD COLUMN resolved_by TEXT;
ALTER TABLE reports ADD COLUMN resolution TEXT DEFAULT '';
ALTER TABLE reports ADD COLUMN resolved_at TEXT;

-- ---------- reconcile: reviews ----------
ALTER TABLE reviews ADD COLUMN author_id TEXT;
ALTER TABLE reviews ADD COLUMN target_type TEXT NOT NULL DEFAULT 'product';
ALTER TABLE reviews ADD COLUMN target_id TEXT;
ALTER TABLE reviews ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE reviews ADD COLUMN body TEXT DEFAULT '';
ALTER TABLE reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';

-- ---------- reconcile: stories ----------
ALTER TABLE stories ADD COLUMN body TEXT DEFAULT '';
ALTER TABLE stories ADD COLUMN era TEXT DEFAULT '';
ALTER TABLE stories ADD COLUMN category TEXT DEFAULT 'history';
ALTER TABLE stories ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE stories ADD COLUMN author_id TEXT;
ALTER TABLE stories ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

-- ---------- reconcile: users ----------
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN email_verify_token TEXT;
ALTER TABLE users ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN pending_balance REAL NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN status_text TEXT DEFAULT 'online';
ALTER TABLE users ADD COLUMN last_seen TEXT;
ALTER TABLE users ADD COLUMN locked_until TEXT;
ALTER TABLE users ADD COLUMN interests TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '[]';

-- ---------- reconcile: volunteer_opportunities ----------
ALTER TABLE volunteer_opportunities ADD COLUMN organization TEXT DEFAULT '';
ALTER TABLE volunteer_opportunities ADD COLUMN category TEXT DEFAULT 'community';
ALTER TABLE volunteer_opportunities ADD COLUMN location_name TEXT DEFAULT '';
ALTER TABLE volunteer_opportunities ADD COLUMN commitment TEXT DEFAULT 'flexible';
ALTER TABLE volunteer_opportunities ADD COLUMN spots INTEGER DEFAULT 0;
ALTER TABLE volunteer_opportunities ADD COLUMN filled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE volunteer_opportunities ADD COLUMN start_date TEXT;
ALTER TABLE volunteer_opportunities ADD COLUMN status TEXT NOT NULL DEFAULT 'open';

