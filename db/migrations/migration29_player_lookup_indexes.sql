-- Existing paired-player indexes cannot efficiently find the second player
-- independently. Small partial indexes serve the active-game availability checks.
CREATE INDEX IF NOT EXISTS chess_active_white_idx ON chess_games(white_player_id) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS chess_active_black_idx ON chess_games(black_player_id) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS ttt_active_x_idx ON ttt_games(x_player_id) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS ttt_active_o_idx ON ttt_games(o_player_id) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS connect_four_active_red_idx ON connect_four_games(red_player_id) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS connect_four_active_yellow_idx ON connect_four_games(yellow_player_id) WHERE status='in_progress';

-- Mission resume/cooldown fetches the latest session, not only completed ones.
CREATE INDEX IF NOT EXISTS daily_sessions_user_created_idx ON daily_sessions(user_id,created_at DESC);
