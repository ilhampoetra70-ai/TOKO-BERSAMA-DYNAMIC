CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  appearance_mode TEXT NOT NULL DEFAULT 'auto' CHECK (appearance_mode IN ('auto', 'light', 'dark')),
  accent TEXT NOT NULL DEFAULT 'amber' CHECK (accent IN ('amber', 'emerald', 'sky', 'rose')),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);
