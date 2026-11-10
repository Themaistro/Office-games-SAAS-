CREATE TABLE IF NOT EXISTS authentication_attempts (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL CHECK(attempts>0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS authentication_attempts_expiry_idx ON authentication_attempts(expires_at);
CREATE TABLE IF NOT EXISTS maintenance_leases(name text PRIMARY KEY,next_run_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS activity_feed_latest_idx ON activity_feed(created_at DESC,id);
CREATE INDEX IF NOT EXISTS activity_feed_session_idx ON activity_feed(user_id,(metadata->>'session_id')) WHERE metadata ? 'session_id';
CREATE INDEX IF NOT EXISTS daily_sessions_completed_latest_idx ON daily_sessions(ended_at DESC,id) WHERE is_completed=true;
CREATE INDEX IF NOT EXISTS chess_feed_latest_idx ON chess_games(updated_at DESC,id) WHERE status IN ('in_progress','white_won','black_won','draw');
CREATE INDEX IF NOT EXISTS ttt_feed_latest_idx ON ttt_games(updated_at DESC,id) WHERE status IN ('in_progress','x_won','o_won','draw');
CREATE INDEX IF NOT EXISTS connect_four_feed_latest_idx ON connect_four_games(updated_at DESC,id) WHERE status IN ('in_progress','red_won','yellow_won','draw');
CREATE INDEX IF NOT EXISTS lounge_feed_latest_idx ON lounge_rooms(updated_at DESC,id) WHERE visibility='public' AND status IN ('in_progress','finished');
