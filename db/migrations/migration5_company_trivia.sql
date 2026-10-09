-- migration5_company_trivia.sql

-- Add department column (default 'General')
ALTER TABLE public.company_trivia
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General';

-- Make target_date optional for the "Anytime" pool
ALTER TABLE public.company_trivia
ALTER COLUMN target_date DROP NOT NULL;
