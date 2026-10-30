-- Testing with zero cooldown must not erase earlier attempts.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT conname FROM pg_constraint
    WHERE conrelid='public.daily_sessions'::regclass AND contype='u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (user_id, date)'
  LOOP
    EXECUTE format('ALTER TABLE public.daily_sessions DROP CONSTRAINT %I', item.conname);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS daily_sessions_active_date_idx
  ON public.daily_sessions(user_id,date) WHERE status='in_progress';
