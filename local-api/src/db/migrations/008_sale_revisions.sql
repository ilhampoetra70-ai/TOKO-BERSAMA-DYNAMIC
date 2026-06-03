CREATE TABLE IF NOT EXISTS sale_revisions (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  reason TEXT NOT NULL,
  edited_by_user_id TEXT NOT NULL,
  edited_at TEXT NOT NULL,
  before_snapshot_json TEXT NOT NULL,
  after_snapshot_json TEXT NOT NULL,
  stock_delta_json TEXT NOT NULL,
  total_before INTEGER NOT NULL CHECK (total_before >= 0),
  total_after INTEGER NOT NULL CHECK (total_after >= 0),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (edited_by_user_id) REFERENCES users(id),
  UNIQUE(sale_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_sale_revisions_sale_id ON sale_revisions(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_revisions_edited_at ON sale_revisions(edited_at);
