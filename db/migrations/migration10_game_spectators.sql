CREATE TABLE IF NOT EXISTS public.game_spectators (
  game_type text NOT NULL CHECK (game_type IN ('chess', 'ttt', 'connect-four')),
  game_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_type, game_id, user_id)
);

CREATE INDEX IF NOT EXISTS game_spectators_active_idx
  ON public.game_spectators(game_type, game_id, last_seen DESC);
