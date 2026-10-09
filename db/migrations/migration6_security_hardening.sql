-- Security hardening for ranked gameplay.
-- Apply after the original schema and the existing policy migrations.

-- Remove the MVP policy that allowed any authenticated or anonymous client to
-- write session questions.
DROP POLICY IF EXISTS "Server mostly manages session questions insert/update" ON public.session_questions;

-- Remove the broad profile update policy before replacing it with a policy for
-- profile details. Scores, roles, levels, and streaks are server-managed.
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update profile details"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Limit the columns writable by the authenticated database role. Server-side
-- service-role operations continue to work for score and role updates.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, department, position, timezone)
  ON public.profiles TO authenticated;

-- A player may only create or update questions belonging to their own session.
DROP POLICY IF EXISTS "Users can create their own session questions" ON public.session_questions;
CREATE POLICY "Users can create their own session questions"
  ON public.session_questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_sessions ds
    WHERE ds.id = session_questions.session_id
      AND ds.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their own session questions" ON public.session_questions;
CREATE POLICY "Users can update their own session questions"
  ON public.session_questions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.daily_sessions ds
    WHERE ds.id = session_questions.session_id
      AND ds.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.daily_sessions ds
    WHERE ds.id = session_questions.session_id
      AND ds.user_id = auth.uid()
  ));

