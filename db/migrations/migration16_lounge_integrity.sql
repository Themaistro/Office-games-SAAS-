-- Database invariants for the shared Office Lounge lifecycle.
-- These partial indexes make challenge creation idempotent under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS chess_waiting_direct_challenge_idx
  ON public.chess_games(white_player_id, black_player_id)
  WHERE status = 'waiting' AND white_player_id IS NOT NULL AND black_player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ttt_waiting_direct_challenge_idx
  ON public.ttt_games(x_player_id, o_player_id)
  WHERE status = 'waiting' AND x_player_id IS NOT NULL AND o_player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS connect_four_waiting_direct_challenge_idx
  ON public.connect_four_games(red_player_id, yellow_player_id)
  WHERE status = 'waiting' AND red_player_id IS NOT NULL AND yellow_player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chess_games_players_status_idx
  ON public.chess_games(white_player_id, black_player_id, status);

CREATE INDEX IF NOT EXISTS ttt_games_players_status_idx
  ON public.ttt_games(x_player_id, o_player_id, status);

CREATE INDEX IF NOT EXISTS connect_four_games_players_status_idx
  ON public.connect_four_games(red_player_id, yellow_player_id, status);
