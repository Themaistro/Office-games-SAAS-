CREATE TABLE IF NOT EXISTS public.daily_mission_overrides (
  mission_date date PRIMARY KEY,
  game_ids uuid[] NOT NULL CHECK (cardinality(game_ids) BETWEEN 1 AND 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);
