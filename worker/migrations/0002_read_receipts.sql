-- Read receipts carry their own timestamp so the UI can show "seen at 14:32"
-- rather than guessing from the message creation time.
ALTER TABLE messages ADD COLUMN read_at TEXT;
