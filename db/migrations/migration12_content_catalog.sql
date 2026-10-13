-- Unified durable content catalog for every game type.
-- Bank-backed and procedural games both receive a stable content_key so
-- player history can prevent repeats for years without relying on payload text.
CREATE TABLE IF NOT EXISTS public.game_content_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type_id uuid NOT NULL REFERENCES public.game_types(id) ON DELETE CASCADE,
  content_key text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'seed',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_type_id, content_key)
);

CREATE INDEX IF NOT EXISTS game_content_catalog_active_idx
  ON public.game_content_catalog(game_type_id, difficulty, is_active);

ALTER TABLE public.question_history
  ADD COLUMN IF NOT EXISTS content_key text;

CREATE INDEX IF NOT EXISTS question_history_user_content_idx
  ON public.question_history(user_id, content_key, served_at DESC);

-- Existing database questions are content too. Backfill stable keys once.
INSERT INTO public.game_content_catalog (game_type_id, content_key, difficulty, payload, source)
SELECT q.game_type_id,
       'question:' || q.id::text,
       q.difficulty,
       jsonb_build_object('question_id', q.id),
       'database'
FROM public.questions q
WHERE NOT EXISTS (
  SELECT 1 FROM public.game_content_catalog c
  WHERE c.game_type_id = q.game_type_id AND c.content_key = 'question:' || q.id::text
);

-- Keep the catalog protected from browser writes; server actions own content.
ALTER TABLE public.game_content_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active game content is readable" ON public.game_content_catalog;
CREATE POLICY "Active game content is readable"
  ON public.game_content_catalog FOR SELECT USING (is_active = true);
