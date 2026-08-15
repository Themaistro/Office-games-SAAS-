-- Add Tier 1 Announcement Features

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('info', 'success', 'warning', 'urgent')) DEFAULT 'info',
ADD COLUMN IF NOT EXISTS cta_text TEXT,
ADD COLUMN IF NOT EXISTS cta_link TEXT;
