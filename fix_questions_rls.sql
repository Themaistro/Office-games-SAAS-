DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.questions;
CREATE POLICY "Allow authenticated inserts" ON public.questions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
