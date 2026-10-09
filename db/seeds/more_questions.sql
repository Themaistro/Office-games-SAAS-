-- Fetch game type IDs for the interactive games
DO $$
DECLARE
  card_id uuid;
  reaction_id uuid;
  sequence_id uuid;
  stroop_id uuid;
BEGIN
  SELECT id INTO card_id FROM public.game_types WHERE slug = 'card_match';
  SELECT id INTO reaction_id FROM public.game_types WHERE slug = 'reaction';
  SELECT id INTO sequence_id FROM public.game_types WHERE slug = 'sequence';
  SELECT id INTO stroop_id FROM public.game_types WHERE slug = 'stroop';

  -- Insert 20 more rows for Card Match
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (card_id, 'hard', '{"text": "Card match concentration!"}', '[]', '', 150, true);
  END LOOP;

  -- Insert 20 more rows for Reaction
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (reaction_id, 'easy', '{"text": "Wait for green!"}', '[]', '', 100, true);
  END LOOP;

  -- Insert 20 more rows for Sequence
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (sequence_id, 'hard', '{"text": "Chimp sequence test"}', '[]', '', 200, true);
  END LOOP;

  -- Insert 20 more rows for Stroop
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (stroop_id, 'medium', '{"text": "Ignore the word, click the color"}', '[]', '', 150, true);
  END LOOP;

  -- Insert 20 more standard Trivia questions to flesh out the pool
  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  SELECT id, 'medium', '{"text": "What is the capital of Japan?"}', '["Tokyo", "Kyoto", "Osaka", "Seoul"]', 'Tokyo', 100, true FROM public.game_types WHERE slug = 'trivia';

  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  SELECT id, 'hard', '{"text": "What year did the Titanic sink?"}', '["1912", "1905", "1915", "1920"]', '1912', 150, true FROM public.game_types WHERE slug = 'trivia';

  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  SELECT id, 'easy', '{"text": "What is 15 + 25?"}', '["30", "40", "35", "50"]', '40', 100, true FROM public.game_types WHERE slug = 'math';

  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  SELECT id, 'medium', '{"text": "Solve for x: 2x = 10"}', '["2", "4", "5", "8"]', '5', 150, true FROM public.game_types WHERE slug = 'math';

END $$;
