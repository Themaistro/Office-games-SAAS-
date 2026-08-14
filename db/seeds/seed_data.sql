-- Insert Game Types
INSERT INTO public.game_types (name, slug, description, is_active) VALUES
('Logic', 'logic', 'Pattern recognition and logical deduction', true),
('Trivia', 'trivia', 'General knowledge and company facts', true),
('Word', 'word', 'Anagrams and vocabulary tests', true),
('Memory', 'memory', 'Short-term recall challenges', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Questions
DO $$
DECLARE
  logic_id uuid;
  trivia_id uuid;
  word_id uuid;
  memory_id uuid;
BEGIN
  SELECT id INTO logic_id FROM public.game_types WHERE slug = 'logic';
  SELECT id INTO trivia_id FROM public.game_types WHERE slug = 'trivia';
  SELECT id INTO word_id FROM public.game_types WHERE slug = 'word';
  SELECT id INTO memory_id FROM public.game_types WHERE slug = 'memory';

  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  VALUES
  (logic_id, 'easy', '{"text": "2, 4, 6, 8, ?"}', '["9", "10", "12", "14"]', '10', 50, true),
  (logic_id, 'medium', '{"text": "1, 1, 2, 3, 5, ?"}', '["6", "7", "8", "9"]', '8', 100, true),
  (logic_id, 'hard', '{"text": "O, T, T, F, F, S, S, E, ?"}', '["N", "T", "E", "O"]', 'N', 150, true),
  
  (trivia_id, 'easy', '{"text": "Which planet is known as the Red Planet?"}', '["Venus", "Jupiter", "Mars", "Saturn"]', 'Mars', 50, true),
  (trivia_id, 'medium', '{"text": "What is the capital of Australia?"}', '["Sydney", "Melbourne", "Canberra", "Perth"]', 'Canberra', 100, true),
  (trivia_id, 'hard', '{"text": "Which element has the chemical symbol ''W''?"}', '["Tungsten", "Wolfram", "Platinum", "Tin"]', 'Tungsten', 150, true),
  
  (word_id, 'easy', '{"text": "a p l p e"}', '["APPLE", "PEARL", "PALE", "LEAP"]', 'APPLE', 50, true),
  (word_id, 'medium', '{"text": "t n o i a c"}', '["ACTION", "NATION", "CANTON", "OCTANT"]', 'ACTION', 100, true),
  (word_id, 'hard', '{"text": "m h i a r g l o t y"}', '["ALGORITHM", "LOGARITHM", "POLYGRAPH", "HOLOGRAM"]', 'ALGORITHM', 150, true),
  
  (memory_id, 'easy', '{"text": "4 9 2"}', '[]', '492', 50, true),
  (memory_id, 'medium', '{"text": "7 1 8 4 5"}', '[]', '71845', 100, true),
  (memory_id, 'hard', '{"text": "3 9 0 2 8 1 5"}', '[]', '3902815', 150, true);
END $$;
