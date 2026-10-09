-- Runtime schema reconciliation
-- The application uses these fields for scoring, progress and timezone-aware
-- session management. Keep this migration idempotent for existing projects.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_time_limit_minutes INTEGER;

ALTER TABLE public.daily_sessions
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.session_questions
  ADD COLUMN IF NOT EXISTS earned_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER NOT NULL DEFAULT 0;

-- Backfill the compatibility flag from the canonical status column.
UPDATE public.daily_sessions
SET is_completed = (status IN ('completed', 'expired'))
WHERE is_completed IS DISTINCT FROM (status IN ('completed', 'expired'));

CREATE OR REPLACE FUNCTION public.sync_daily_session_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed THEN
    NEW.status := CASE WHEN NEW.status = 'expired' THEN 'expired' ELSE 'completed' END;
  ELSIF NEW.status IN ('completed', 'expired') THEN
    NEW.is_completed := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_daily_session_completion ON public.daily_sessions;
CREATE TRIGGER sync_daily_session_completion
  BEFORE INSERT OR UPDATE OF is_completed, status ON public.daily_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_daily_session_completion();

CREATE INDEX IF NOT EXISTS daily_sessions_user_completed_idx
  ON public.daily_sessions(user_id, is_completed, date);

CREATE INDEX IF NOT EXISTS session_questions_session_completed_idx
  ON public.session_questions(session_id, is_completed, order_index);
