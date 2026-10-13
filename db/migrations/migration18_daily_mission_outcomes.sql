-- A timed-out route is a closed attempt, not a successful daily completion.
-- This also repairs any historic rows written by the old compatibility trigger.

CREATE OR REPLACE FUNCTION public.sync_daily_session_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'expired' THEN
    NEW.is_completed := false;
  ELSIF NEW.is_completed OR NEW.status = 'completed' THEN
    NEW.is_completed := true;
    NEW.status := 'completed';
  ELSE
    NEW.is_completed := false;
    NEW.status := 'in_progress';
  END IF;
  RETURN NEW;
END;
$$;

WITH incomplete_sessions AS (
  SELECT ds.id
  FROM public.daily_sessions ds
  JOIN public.session_questions sq ON sq.session_id = ds.id
  WHERE ds.is_completed = true
  GROUP BY ds.id
  HAVING COUNT(*) FILTER (WHERE sq.is_completed) < COUNT(*)
)
UPDATE public.daily_sessions
SET status = 'expired', is_completed = false, total_xp_earned = 0
WHERE id IN (SELECT id FROM incomplete_sessions);
