-- Enable RLS on both tables (just in case they were disabled)
ALTER TABLE "public"."session_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;

-- Session Questions Policies
-- Allow users to insert their own session questions
DROP POLICY IF EXISTS "Users can create their own session questions" ON "public"."session_questions";
CREATE POLICY "Users can create their own session questions" ON "public"."session_questions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_sessions
    WHERE daily_sessions.id = session_questions.session_id
    AND daily_sessions.user_id = auth.uid()
  )
);

-- Allow users to view their own session questions
DROP POLICY IF EXISTS "Users can view their own session questions" ON "public"."session_questions";
CREATE POLICY "Users can view their own session questions" ON "public"."session_questions"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM daily_sessions
    WHERE daily_sessions.id = session_questions.session_id
    AND daily_sessions.user_id = auth.uid()
  )
);

-- Allow users to update their own session questions
DROP POLICY IF EXISTS "Users can update their own session questions" ON "public"."session_questions";
CREATE POLICY "Users can update their own session questions" ON "public"."session_questions"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM daily_sessions
    WHERE daily_sessions.id = session_questions.session_id
    AND daily_sessions.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_sessions
    WHERE daily_sessions.id = session_questions.session_id
    AND daily_sessions.user_id = auth.uid()
  )
);

-- Allow admins full access to session_questions
DROP POLICY IF EXISTS "Admins have full access to session_questions" ON "public"."session_questions";
CREATE POLICY "Admins have full access to session_questions" ON "public"."session_questions"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Questions Policies
-- Allow anyone to select active questions
DROP POLICY IF EXISTS "Anyone can view active questions" ON "public"."questions";
CREATE POLICY "Anyone can view active questions" ON "public"."questions"
FOR SELECT
USING (is_active = true);

-- Allow admins full access to questions
DROP POLICY IF EXISTS "Admins have full access to questions" ON "public"."questions";
CREATE POLICY "Admins have full access to questions" ON "public"."questions"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
