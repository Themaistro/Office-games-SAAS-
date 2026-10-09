CREATE TABLE IF NOT EXISTS public.challenge_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id uuid NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('chess', 'ttt', 'connect-four')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  challenger_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  challenged_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'accepted', 'declined', 'cancelled', 'expired', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS challenge_events_users_idx ON public.challenge_events(challenger_id, challenged_id, created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_events_game_idx ON public.challenge_events(game_id, game_type, created_at DESC);
