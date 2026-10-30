CREATE TABLE IF NOT EXISTS public.season_snapshots (
  season_number integer NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp integer NOT NULL,
  lounge_lp integer NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(season_number,user_id)
);
