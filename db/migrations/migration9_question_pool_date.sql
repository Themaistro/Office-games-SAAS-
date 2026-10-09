-- Keep generated daily pools tied to the player's local calendar date.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS pool_date date;

CREATE INDEX IF NOT EXISTS questions_pool_date_game_idx
  ON public.questions(pool_date, game_type_id, difficulty);
