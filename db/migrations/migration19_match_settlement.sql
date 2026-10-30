-- Additive only: existing match histories are not re-awarded.
CREATE TABLE IF NOT EXISTS public.match_results (
  game_type text NOT NULL,
  game_id uuid NOT NULL,
  player1_id uuid REFERENCES public.profiles(id),
  player2_id uuid REFERENCES public.profiles(id),
  winner_id uuid REFERENCES public.profiles(id),
  reason text NOT NULL,
  player1_lp_delta integer NOT NULL,
  player2_lp_delta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_type, game_id)
);
ALTER TABLE public.chess_games ADD COLUMN IF NOT EXISTS draw_offered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.session_questions ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE public.session_questions ADD COLUMN IF NOT EXISTS hint_used boolean NOT NULL DEFAULT false;
-- Unknown historic outcomes stay unknown; XP is not a correctness flag.
CREATE INDEX IF NOT EXISTS match_results_players_idx ON public.match_results(player1_id, player2_id, created_at);
