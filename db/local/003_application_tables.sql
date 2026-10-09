-- Base tables that were previously created in the hosted database and were not
-- represented in the repository's migration chain.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_time_limit_minutes integer,
  ADD COLUMN IF NOT EXISTS session_time_limit_minutes integer;

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  cta_text text,
  cta_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_trivia (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_slug text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  target_date date,
  department text NOT NULL DEFAULT 'General',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prizes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_requirement integer NOT NULL,
  title text NOT NULL,
  icon_emoji text NOT NULL DEFAULT '🏆',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  current_season integer NOT NULL DEFAULT 1,
  season_start_date timestamptz NOT NULL DEFAULT now(),
  cooldown_hours integer NOT NULL DEFAULT 24,
  daily_time_limit_minutes integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.season_winners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number integer,
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  total_xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.presence (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chess_games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  white_player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  black_player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  fen text NOT NULL DEFAULT 'start',
  pgn text NOT NULL DEFAULT '',
  turn text NOT NULL DEFAULT 'w',
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ttt_games (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  x_player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  o_player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  board jsonb NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]'::jsonb,
  current_turn text NOT NULL DEFAULT 'X',
  status text NOT NULL DEFAULT 'waiting',
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ttt_games ADD COLUMN IF NOT EXISTS board_state text;
UPDATE public.ttt_games SET board_state = '---------' WHERE board_state IS NULL;
ALTER TABLE public.ttt_games ALTER COLUMN board_state SET DEFAULT '---------';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ttt_elo integer NOT NULL DEFAULT 1200;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chess_elo integer NOT NULL DEFAULT 1200;
ALTER TABLE public.chess_games
  ADD COLUMN IF NOT EXISTS white_time_ms bigint NOT NULL DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS black_time_ms bigint NOT NULL DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS last_move_timestamp timestamptz;

CREATE INDEX IF NOT EXISTS activity_feed_created_at_idx ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS chess_games_status_idx ON public.chess_games(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ttt_games_status_idx ON public.ttt_games(status, updated_at DESC);

INSERT INTO public.system_settings (cooldown_hours, daily_time_limit_minutes)
VALUES (24, 15)
ON CONFLICT DO NOTHING;

