-- Insert the 5 new game types for Wave 1
INSERT INTO public.game_types (name, slug, description, is_active) VALUES
('Sudoku Lite', 'sudoku_lite', '4x4 Logic Grid', true),
('Odd Object', 'odd_object', 'Find the one that is different', true),
('Word Unscramble', 'unscramble', 'Unscramble the letters to form a word', true),
('Speed Typing', 'typing', 'Type the sentence perfectly', true),
('Mental Math', 'mental_math', 'Solve the equation rapidly', true)
ON CONFLICT (slug) DO NOTHING;

-- Populate with 20 questions each to fill the endless pool
DO $$
DECLARE
  sudoku_id uuid;
  odd_id uuid;
  unscramble_id uuid;
  typing_id uuid;
  math_id uuid;
BEGIN
  SELECT id INTO sudoku_id FROM public.game_types WHERE slug = 'sudoku_lite';
  SELECT id INTO odd_id FROM public.game_types WHERE slug = 'odd_object';
  SELECT id INTO unscramble_id FROM public.game_types WHERE slug = 'unscramble';
  SELECT id INTO typing_id FROM public.game_types WHERE slug = 'typing';
  SELECT id INTO math_id FROM public.game_types WHERE slug = 'mental_math';

  -- Sudoku Lite
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (sudoku_id, 'hard', '{"text": "Solve the 4x4 Grid"}', '[]', '', 150, true);
  END LOOP;

  -- Odd Object
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (odd_id, 'medium', '{"text": "Find the odd shape out"}', '[]', '', 100, true);
  END LOOP;

  -- Word Unscramble
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (unscramble_id, 'medium', '{"text": "Unscramble"}', '[]', '', 120, true);
  END LOOP;

  -- Speed Typing
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (typing_id, 'easy', '{"text": "Type"}', '[]', '', 100, true);
  END LOOP;

  -- Mental Math
  FOR i IN 1..20 LOOP
    INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
    VALUES (math_id, 'hard', '{"text": "Solve"}', '[]', '', 150, true);
  END LOOP;

END $$;
