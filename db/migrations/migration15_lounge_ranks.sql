ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lounge_lp integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_lounge_lp_nonnegative CHECK (lounge_lp >= 0);
