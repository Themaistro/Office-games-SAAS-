-- Insert Game Types
INSERT INTO public.game_types (name, slug, description, is_active) VALUES
('Card Match', 'card_match', 'Find matching pairs as fast as possible', true),
('Reaction', 'reaction', 'Test your reflex speed', true),
('Sequence', 'sequence', 'Chimp test memory game', true),
('Stroop', 'stroop', 'Color confusion test', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Questions for the new game modes
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

  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  VALUES
  -- CARD MATCH
  (card_id, 'medium', '{"text": "Match the pairs!"}', '[]', '', 150, true),
  (card_id, 'medium', '{"text": "Concentration test"}', '[]', '', 150, true),

  -- REACTION
  (reaction_id, 'easy', '{"text": "Click when green!"}', '[]', '', 100, true),
  (reaction_id, 'easy', '{"text": "Reflex speed test"}', '[]', '', 100, true),

  -- SEQUENCE
  (sequence_id, 'hard', '{"text": "Click numbers 1 to 5"}', '[]', '', 200, true),
  (sequence_id, 'hard', '{"text": "Chimp memory test"}', '[]', '', 200, true),

  -- STROOP
  (stroop_id, 'medium', '{"text": "Click the font color!"}', '[]', '', 150, true),
  (stroop_id, 'medium', '{"text": "Color confusion test"}', '[]', '', 150, true);

END $$;
