-- Create Master Bank Tables for 1-Year Runway

CREATE TABLE IF NOT EXISTS public.master_trivia_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    decoys JSONB NOT NULL,
    department TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.master_word_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.master_typing_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.master_odd_object_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    theme TEXT NOT NULL,
    items JSONB NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.master_trivia_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_word_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_typing_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_odd_object_bank ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since the server pulls these to generate games, though service role bypasses this anyway)
CREATE POLICY "Allow public read access to master_trivia_bank" ON public.master_trivia_bank FOR SELECT USING (true);
CREATE POLICY "Allow public read access to master_word_bank" ON public.master_word_bank FOR SELECT USING (true);
CREATE POLICY "Allow public read access to master_typing_bank" ON public.master_typing_bank FOR SELECT USING (true);
CREATE POLICY "Allow public read access to master_odd_object_bank" ON public.master_odd_object_bank FOR SELECT USING (true);
