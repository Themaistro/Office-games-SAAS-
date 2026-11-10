-- Match the read model's NULLS LAST ordering so per-source limits can use indexes.
DROP INDEX IF EXISTS activity_feed_latest_idx;
CREATE INDEX activity_feed_latest_idx ON activity_feed(created_at DESC NULLS LAST,id);
DROP INDEX IF EXISTS daily_sessions_completed_latest_idx;
CREATE INDEX daily_sessions_completed_latest_idx ON daily_sessions(ended_at DESC NULLS LAST,id) WHERE is_completed=true;
DROP INDEX IF EXISTS chess_feed_latest_idx;
CREATE INDEX chess_feed_latest_idx ON chess_games(updated_at DESC NULLS LAST,id) WHERE status IN ('in_progress','white_won','black_won','draw');
DROP INDEX IF EXISTS ttt_feed_latest_idx;
CREATE INDEX ttt_feed_latest_idx ON ttt_games(updated_at DESC NULLS LAST,id) WHERE status IN ('in_progress','x_won','o_won','draw');
DROP INDEX IF EXISTS connect_four_feed_latest_idx;
CREATE INDEX connect_four_feed_latest_idx ON connect_four_games(updated_at DESC NULLS LAST,id) WHERE status IN ('in_progress','red_won','yellow_won','draw');
DROP INDEX IF EXISTS lounge_feed_latest_idx;
CREATE INDEX lounge_feed_latest_idx ON lounge_rooms(updated_at DESC NULLS LAST,id) WHERE visibility='public' AND status IN ('in_progress','finished');
