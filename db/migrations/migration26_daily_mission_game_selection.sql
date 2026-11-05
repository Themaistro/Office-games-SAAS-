-- Optional administrator-selected pool for Daily Mission rotation.
-- NULL keeps the existing behavior: every active game is eligible.
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS daily_mission_game_ids uuid[];
