-- Legacy procedural rows used empty JSON payloads and re-generated a new
-- challenge whenever the client mounted. Give each record an explicit stable
-- seed so it can represent one repeatable challenge and participate in history.
UPDATE public.questions
SET content = jsonb_build_object('seed', id::text, 'legacySeeded', true)
WHERE content = '{}'::jsonb
  AND game_type_id IN (
    SELECT id FROM public.game_types
    WHERE slug IN ('card_match', 'reaction', 'sequence', 'stroop')
  );

-- Keep the catalog aligned for rows created before the catalog existed.
UPDATE public.game_content_catalog catalog
SET payload = jsonb_build_object('question_id', question.id, 'seed', question.content->>'seed')
FROM public.questions question
WHERE catalog.game_type_id = question.game_type_id
  AND catalog.content_key = 'question:' || question.id::text
  AND question.content ? 'seed';
