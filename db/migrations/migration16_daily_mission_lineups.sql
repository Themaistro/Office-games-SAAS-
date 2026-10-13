-- One calculated game lineup per calendar day. Persisting it means every
-- employee sees the same office mission and a refresh can never reshuffle it.
CREATE TABLE IF NOT EXISTS public.daily_mission_lineups (
  mission_date date PRIMARY KEY,
  game_ids uuid[] NOT NULL,
  seed bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS daily_game_count integer NOT NULL DEFAULT 5;

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS system_settings_daily_game_count_check;
ALTER TABLE public.system_settings
  ADD CONSTRAINT system_settings_daily_game_count_check
  CHECK (daily_game_count BETWEEN 1 AND 20);
