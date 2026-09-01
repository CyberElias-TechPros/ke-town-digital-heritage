-- ============================================================
-- KE Kingdom — D1 seed data
-- Run with: npx wrangler d1 execute ke_kingdom --local --file=./seed.sql
--           npx wrangler d1 execute ke_kingdom --remote --file=./seed.sql
--
-- The admin password below is: Admin123!
-- CHANGE IT immediately after first login.
-- ============================================================

-- Seed admin user
INSERT INTO users (id, full_name, email, username, password_hash, role, account_status, email_verified, created_at, updated_at)
VALUES
  ('a0000000000000000000000000000001', 'KE Kingdom Admin', 'admin@kingdom.com.ng', 'admin',
   'pbkdf2$sha256$100000$avDRRtDIJpH82BZUwlaiSQ==$tB8UBFkwbBuqXQM53UnwhHpWFUr8LkaaWbj/yTatxS0=',
   'admin', 'active', 1, strftime('%s','now')*1000, strftime('%s','now')*1000);

-- Sample news
INSERT INTO news (id, author_id, title, slug, excerpt, content, category, published, created_at, updated_at)
VALUES
  ('b1000000000000000000000000000001', 'a0000000000000000000000000000001',
   'Welcome to KE Kingdom Digital Heritage', 'welcome-to-ke-kingdom',
   'A digital home for the Kalabari heritage of Ke Kingdom.',
   'Welcome! This platform preserves the history, culture, language, and traditions of Ke Kingdom for current and future generations.',
   'Community', 1, strftime('%s','now')*1000, strftime('%s','now')*1000);

-- Sample event
INSERT INTO events (id, creator_id, title, slug, category, event_type, description, start_date, status, visibility, created_at, updated_at)
VALUES
  ('c1000000000000000000000000000001', 'a0000000000000000000000000000001',
   'Ekine Masquerade Festival', 'ekine-masquerade-festival',
   'Cultural', 'festival', 'Annual display of the Ekine (masquerade) tradition of Ke Kingdom.', 
   date('now'), 'published', 'public', strftime('%s','now')*1000, strftime('%s','now')*1000);

-- Sample group
INSERT INTO groups (id, creator_id, name, slug, description, category, visibility, member_count, created_at, updated_at)
VALUES
  ('d1000000000000000000000000000001', 'a0000000000000000000000000000001',
   'Kalabari Language Learners', 'kalabari-language-learners',
   'Practice and preserve the Kalabari language.', 'Language', 'public', 1,
   strftime('%s','now')*1000, strftime('%s','now')*1000);

INSERT INTO group_members (id, group_id, user_id, role, joined_at)
VALUES ('d2000000000000000000000000000001', 'd1000000000000000000000000000001', 'a0000000000000000000000000000001', 'admin', strftime('%s','now')*1000);
