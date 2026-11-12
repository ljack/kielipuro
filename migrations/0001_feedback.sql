CREATE TABLE slack_events (
  id TEXT PRIMARY KEY,
  team TEXT NOT NULL,
  channel TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  issue_number INTEGER,
  issue_url TEXT,
  delivered_at TEXT,
  UNIQUE(team, channel, message_ts)
);
CREATE INDEX pending_events ON slack_events(delivered_at, created_at);
CREATE INDEX slack_threads ON slack_events(team, channel, thread_ts);
CREATE TABLE monitor_state (id INTEGER PRIMARY KEY CHECK(id=1), last_success TEXT NOT NULL, summary TEXT NOT NULL);
