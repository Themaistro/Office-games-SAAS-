CREATE TABLE IF NOT EXISTS public.user_daily_mission_lineups (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 mission_date date NOT NULL,
 game_ids uuid[] NOT NULL,
 seed bigint NOT NULL,
 PRIMARY KEY(user_id, mission_date)
);
