-- The original schema used a standalone unique index, not a UNIQUE constraint.
-- Keep historical attempts when admins allow another mission on the same date.
DROP INDEX IF EXISTS public.daily_sessions_user_date_idx;
CREATE UNIQUE INDEX IF NOT EXISTS daily_sessions_active_date_idx
  ON public.daily_sessions(user_id,date) WHERE status='in_progress';
