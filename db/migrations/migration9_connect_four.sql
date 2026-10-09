CREATE TABLE IF NOT EXISTS public.connect_four_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  red_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  yellow_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  board_state TEXT NOT NULL DEFAULT '------------------------------------------',
  current_turn TEXT NOT NULL DEFAULT 'R' CHECK (current_turn IN ('R','Y')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','in_progress','red_won','yellow_won','draw','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.connect_four_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Connect Four games are viewable by authenticated users" ON public.connect_four_games;
CREATE POLICY "Connect Four games are viewable by authenticated users" ON public.connect_four_games FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Players can create Connect Four games" ON public.connect_four_games;
CREATE POLICY "Players can create Connect Four games" ON public.connect_four_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = red_player_id OR auth.uid() = yellow_player_id);
DROP POLICY IF EXISTS "Players can update their Connect Four games" ON public.connect_four_games;
CREATE POLICY "Players can update their Connect Four games" ON public.connect_four_games FOR UPDATE TO authenticated
  USING (auth.uid() = red_player_id OR auth.uid() = yellow_player_id)
  WITH CHECK (auth.uid() = red_player_id OR auth.uid() = yellow_player_id);
DROP POLICY IF EXISTS "Players can cancel their Connect Four games" ON public.connect_four_games;
CREATE POLICY "Players can cancel their Connect Four games" ON public.connect_four_games FOR DELETE TO authenticated
  USING (auth.uid() = red_player_id OR auth.uid() = yellow_player_id);
CREATE INDEX IF NOT EXISTS connect_four_open_games_idx ON public.connect_four_games(status, created_at DESC);
