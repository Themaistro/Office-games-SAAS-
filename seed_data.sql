-- Insert Game Types
INSERT INTO public.game_types (id, name, slug, description, is_active) VALUES
('gt_logic_001', 'Logic', 'logic', 'Pattern recognition and logical deduction', true),
('gt_trivia_001', 'Trivia', 'trivia', 'General knowledge and company facts', true),
('gt_word_001', 'Word', 'word', 'Anagrams and vocabulary tests', true),
('gt_memory_001', 'Memory', 'memory', 'Short-term recall challenges', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Questions
INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active) VALUES
-- Logic Games
('gt_logic_001', 'easy', '{"text": "2, 4, 6, 8, ?"}', '["9", "10", "12", "14"]', '10', 50, true),
('gt_logic_001', 'medium', '{"text": "1, 1, 2, 3, 5, ?"}', '["6", "7", "8", "9"]', '8', 100, true),
('gt_logic_001', 'hard', '{"text": "O, T, T, F, F, S, S, E, ?"}', '["N", "T", "E", "O"]', 'N', 150, true), -- One, Two, Three... Nine

-- Trivia Games
('gt_trivia_001', 'easy', '{"text": "Which planet is known as the Red Planet?"}', '["Venus", "Jupiter", "Mars", "Saturn"]', 'Mars', 50, true),
('gt_trivia_001', 'medium', '{"text": "What is the capital of Australia?"}', '["Sydney", "Melbourne", "Canberra", "Perth"]', 'Canberra', 100, true),
('gt_trivia_001', 'hard', '{"text": "Which element has the chemical symbol ''W''?"}', '["Tungsten", "Wolfram", "Platinum", "Tin"]', 'Tungsten', 150, true),

-- Word Games
('gt_word_001', 'easy', '{"text": "a p l p e"}', '["APPLE", "PEARL", "PALE", "LEAP"]', 'APPLE', 50, true),
('gt_word_001', 'medium', '{"text": "t n o i a c"}', '["ACTION", "NATION", "CANTON", "OCTANT"]', 'ACTION', 100, true),
('gt_word_001', 'hard', '{"text": "m h i a r g l o t y"}', '["ALGORITHM", "LOGARITHM", "POLYGRAPH", "HOLOGRAM"]', 'ALGORITHM', 150, true),

-- Memory Games (No options array for memory, user types it)
('gt_memory_001', 'easy', '{"text": "4 9 2"}', '[]', '492', 50, true),
('gt_memory_001', 'medium', '{"text": "7 1 8 4 5"}', '[]', '71845', 100, true),
('gt_memory_001', 'hard', '{"text": "3 9 0 2 8 1 5"}', '[]', '3902815', 150, true);
