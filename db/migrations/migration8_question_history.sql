-- Per-player question history. This prevents the same question from being
-- served again within the retention window while allowing long-term reuse.

CREATE TABLE IF NOT EXISTS public.question_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.daily_sessions(id) ON DELETE SET NULL,
  served_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS question_history_user_served_idx
  ON public.question_history(user_id, served_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS question_history_session_question_idx
  ON public.question_history(session_id, question_id)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.question_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players can view their own question history" ON public.question_history;
CREATE POLICY "Players can view their own question history"
  ON public.question_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Players can record their own question history" ON public.question_history;
CREATE POLICY "Players can record their own question history"
  ON public.question_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Keep the table bounded. The application queries one year; older records are
-- no longer needed for duplicate prevention and can be removed periodically.
CREATE OR REPLACE FUNCTION public.purge_old_question_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.question_history
  WHERE served_at < timezone('utc'::text, now()) - interval '1 year';
$$;
