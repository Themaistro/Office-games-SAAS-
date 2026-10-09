-- Add per-difficulty daily mission round settings used by the admin panel
-- and the daily mission selector.
ALTER TABLE game_types
  ADD COLUMN IF NOT EXISTS easy_rounds integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS medium_rounds integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hard_rounds integer NOT NULL DEFAULT 1;

ALTER TABLE game_types
  DROP CONSTRAINT IF EXISTS game_types_easy_rounds_check,
  DROP CONSTRAINT IF EXISTS game_types_medium_rounds_check,
  DROP CONSTRAINT IF EXISTS game_types_hard_rounds_check;

ALTER TABLE game_types
  ADD CONSTRAINT game_types_easy_rounds_check CHECK (easy_rounds >= 0),
  ADD CONSTRAINT game_types_medium_rounds_check CHECK (medium_rounds >= 0),
  ADD CONSTRAINT game_types_hard_rounds_check CHECK (hard_rounds >= 0);
