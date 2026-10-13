-- One visible prize per leaderboard rank. This makes replacements atomic and
-- prevents duplicate rewards if two admin saves happen at the same time.
CREATE UNIQUE INDEX IF NOT EXISTS prizes_rank_requirement_unique
  ON public.prizes (rank_requirement);

ALTER TABLE public.prizes
  DROP CONSTRAINT IF EXISTS prizes_rank_requirement_positive;
ALTER TABLE public.prizes
  ADD CONSTRAINT prizes_rank_requirement_positive
  CHECK (rank_requirement BETWEEN 1 AND 100);
