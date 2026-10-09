-- Season Management Migration

CREATE TABLE IF NOT EXISTS public.system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    current_season INT NOT NULL DEFAULT 1,
    season_start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert the initial settings row if it doesn't exist
INSERT INTO public.system_settings (id, current_season, season_start_date)
VALUES (1, 1, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.season_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_number INT NOT NULL,
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT,
    rank INT NOT NULL,
    total_xp INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on season_winners
ALTER TABLE public.season_winners ENABLE ROW LEVEL SECURITY;

-- Allow public read access to winners so they can be displayed on a "Past Winners" page
CREATE POLICY "Allow public read access to season_winners" ON public.season_winners FOR SELECT USING (true);
