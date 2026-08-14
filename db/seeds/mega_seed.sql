-- Insert Game Types
INSERT INTO public.game_types (name, slug, description, is_active) VALUES
('Logic', 'logic', 'Pattern recognition and logical deduction', true),
('Trivia', 'trivia', 'General knowledge and company facts', true),
('Word', 'word', 'Anagrams and vocabulary tests', true),
('Memory', 'memory', 'Short-term recall challenges', true),
('Math', 'math', 'Speed arithmetic and math puzzles', true),
('Coding', 'coding', 'Developer and programming trivia', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert 50+ Questions
DO $$
DECLARE
  logic_id uuid;
  trivia_id uuid;
  word_id uuid;
  memory_id uuid;
  math_id uuid;
  coding_id uuid;
BEGIN
  SELECT id INTO logic_id FROM public.game_types WHERE slug = 'logic';
  SELECT id INTO trivia_id FROM public.game_types WHERE slug = 'trivia';
  SELECT id INTO word_id FROM public.game_types WHERE slug = 'word';
  SELECT id INTO memory_id FROM public.game_types WHERE slug = 'memory';
  SELECT id INTO math_id FROM public.game_types WHERE slug = 'math';
  SELECT id INTO coding_id FROM public.game_types WHERE slug = 'coding';

  INSERT INTO public.questions (game_type_id, difficulty, content, options, correct_answer, base_xp, is_active)
  VALUES
  -- MATH (10)
  (math_id, 'easy', '{"text": "What is 15 + 27?"}', '["32", "42", "45", "52"]', '42', 50, true),
  (math_id, 'easy', '{"text": "What is 9 * 8?"}', '["64", "72", "81", "90"]', '72', 50, true),
  (math_id, 'easy', '{"text": "What is 144 / 12?"}', '["10", "12", "14", "24"]', '12', 50, true),
  (math_id, 'medium', '{"text": "Solve for x: 3x - 7 = 14"}', '["5", "6", "7", "8"]', '7', 100, true),
  (math_id, 'medium', '{"text": "If a triangle has a base of 10 and height of 5, what is its area?"}', '["15", "20", "25", "50"]', '25', 100, true),
  (math_id, 'medium', '{"text": "What is 15% of 200?"}', '["15", "20", "30", "45"]', '30', 100, true),
  (math_id, 'hard', '{"text": "What is the next prime number after 31?"}', '["33", "35", "37", "39"]', '37', 150, true),
  (math_id, 'hard', '{"text": "What is the square root of 625?"}', '["15", "25", "35", "45"]', '25', 150, true),
  (math_id, 'hard', '{"text": "Solve: (8 + 2) * (5 - 3)^2"}', '["20", "40", "60", "80"]', '40', 150, true),
  (math_id, 'hard', '{"text": "If 5 machines make 5 widgets in 5 minutes, how long do 100 machines take to make 100 widgets?"}', '["5 minutes", "20 minutes", "100 minutes", "500 minutes"]', '5 minutes', 150, true),

  -- CODING (10)
  (coding_id, 'easy', '{"text": "What does HTML stand for?"}', '["Hyper Text Preprocessor", "Hyper Text Markup Language", "Hyper Tool Multi Language", "Hyperlink Text Markup Language"]', 'Hyper Text Markup Language', 50, true),
  (coding_id, 'easy', '{"text": "In JavaScript, what is used to declare a block-scoped variable?"}', '["var", "let", "def", "int"]', 'let', 50, true),
  (coding_id, 'easy', '{"text": "Which symbol is used for single-line comments in JavaScript?"}', '["//", "/*", "<!--", "#"]', '//', 50, true),
  (coding_id, 'medium', '{"text": "What does CSS stand for?"}', '["Computer Style Sheets", "Creative Style System", "Cascading Style Sheets", "Colorful Style Sheets"]', 'Cascading Style Sheets', 100, true),
  (coding_id, 'medium', '{"text": "Which Git command is used to save changes to the local repository?"}', '["git push", "git save", "git commit", "git store"]', 'git commit', 100, true),
  (coding_id, 'medium', '{"text": "In SQL, what statement is used to retrieve data from a database?"}', '["GET", "EXTRACT", "SELECT", "PULL"]', 'SELECT', 100, true),
  (coding_id, 'hard', '{"text": "What is the time complexity of binary search?"}', '["O(1)", "O(n)", "O(n log n)", "O(log n)"]', 'O(log n)', 150, true),
  (coding_id, 'hard', '{"text": "Which HTTP status code means ''Not Found''?"}', '["200", "403", "404", "500"]', '404', 150, true),
  (coding_id, 'hard', '{"text": "What design pattern ensures a class has only one instance?"}', '["Factory", "Singleton", "Observer", "Decorator"]', 'Singleton', 150, true),
  (coding_id, 'hard', '{"text": "In React, what hook is used to perform side effects?"}', '["useState", "useContext", "useEffect", "useReducer"]', 'useEffect', 150, true),

  -- LOGIC (10)
  (logic_id, 'easy', '{"text": "2, 4, 6, 8, ?"}', '["9", "10", "12", "14"]', '10', 50, true),
  (logic_id, 'easy', '{"text": "10, 20, 30, 40, ?"}', '["45", "50", "55", "60"]', '50', 50, true),
  (logic_id, 'easy', '{"text": "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops Lazzies?"}', '["Yes", "No", "Maybe", "Need more info"]', 'Yes', 50, true),
  (logic_id, 'medium', '{"text": "1, 1, 2, 3, 5, ?"}', '["6", "7", "8", "9"]', '8', 100, true),
  (logic_id, 'medium', '{"text": "Which word does NOT belong?"}', '["Apple", "Banana", "Carrot", "Orange"]', 'Carrot', 100, true),
  (logic_id, 'medium', '{"text": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?"}', '["$0.05", "$0.10", "$1.00", "$0.15"]', '$0.05', 100, true),
  (logic_id, 'hard', '{"text": "O, T, T, F, F, S, S, E, ?"}', '["N", "T", "E", "O"]', 'N', 150, true),
  (logic_id, 'hard', '{"text": "J, F, M, A, M, J, J, A, S, O, ?"}', '["N", "D", "M", "Y"]', 'N', 150, true),
  (logic_id, 'hard', '{"text": "If some A are B, and no B are C, which is true?"}', '["All A are C", "Some A are not C", "No A are C", "All C are A"]', 'Some A are not C', 150, true),
  (logic_id, 'hard', '{"text": "You are in a race and you overtake the person in second place. What place are you in?"}', '["First", "Second", "Third", "Last"]', 'Second', 150, true),

  -- TRIVIA (10)
  (trivia_id, 'easy', '{"text": "Which planet is known as the Red Planet?"}', '["Venus", "Jupiter", "Mars", "Saturn"]', 'Mars', 50, true),
  (trivia_id, 'easy', '{"text": "How many continents are there?"}', '["5", "6", "7", "8"]', '7', 50, true),
  (trivia_id, 'easy', '{"text": "What is the largest ocean on Earth?"}', '["Atlantic", "Indian", "Arctic", "Pacific"]', 'Pacific', 50, true),
  (trivia_id, 'medium', '{"text": "What is the capital of Australia?"}', '["Sydney", "Melbourne", "Canberra", "Perth"]', 'Canberra', 100, true),
  (trivia_id, 'medium', '{"text": "Who painted the Mona Lisa?"}', '["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"]', 'Da Vinci', 100, true),
  (trivia_id, 'medium', '{"text": "What is the hardest natural substance on Earth?"}', '["Gold", "Iron", "Diamond", "Platinum"]', 'Diamond', 100, true),
  (trivia_id, 'hard', '{"text": "Which element has the chemical symbol ''W''?"}', '["Tungsten", "Wolfram", "Platinum", "Tin"]', 'Tungsten', 150, true),
  (trivia_id, 'hard', '{"text": "What year did the Titanic sink in the Atlantic Ocean?"}', '["1908", "1912", "1916", "1920"]', '1912', 150, true),
  (trivia_id, 'hard', '{"text": "Who was the first woman to win a Nobel Prize?"}', '["Mother Teresa", "Marie Curie", "Rosa Parks", "Amelia Earhart"]', 'Marie Curie', 150, true),
  (trivia_id, 'hard', '{"text": "What is the smallest country in the world?"}', '["Monaco", "Nauru", "Vatican City", "Tuvalu"]', 'Vatican City', 150, true),

  -- WORD (10)
  (word_id, 'easy', '{"text": "a p l p e"}', '["APPLE", "PEARL", "PALE", "LEAP"]', 'APPLE', 50, true),
  (word_id, 'easy', '{"text": "o c l k c"}', '["LOCK", "CLOCK", "FLOCK", "BLOCK"]', 'CLOCK', 50, true),
  (word_id, 'easy', '{"text": "g d o"}', '["DOG", "GOD", "ODD", "DIG"]', 'DOG', 50, true),
  (word_id, 'medium', '{"text": "t n o i a c"}', '["ACTION", "NATION", "CANTON", "OCTANT"]', 'ACTION', 100, true),
  (word_id, 'medium', '{"text": "g n i r s p"}', '["SPRING", "RINGS", "SPRIG", "PING"]', 'SPRING', 100, true),
  (word_id, 'medium', '{"text": "e r a l e d"}', '["DEALER", "LEADER", "REAL", "DARE"]', 'LEADER', 100, true),
  (word_id, 'hard', '{"text": "m h i a r g l o t y"}', '["ALGORITHM", "LOGARITHM", "POLYGRAPH", "HOLOGRAM"]', 'ALGORITHM', 150, true),
  (word_id, 'hard', '{"text": "c r p y t o a r p y h g"}', '["CRYPTOGRAPHY", "PHOTOGRAPHY", "TYPOGRAPHY", "CARTOGRAPHY"]', 'CRYPTOGRAPHY', 150, true),
  (word_id, 'hard', '{"text": "e p s r v e r n c a e e"}', '["PERSEVERANCE", "PRESERVATION", "REVERENCE", "SEVERANCE"]', 'PERSEVERANCE', 150, true),
  (word_id, 'hard', '{"text": "t i o n s u b s t i t u"}', '["SUBSTITUTION", "CONSTITUTION", "INSTITUTION", "RESTITUTION"]', 'SUBSTITUTION', 150, true),

  -- MEMORY (5)
  (memory_id, 'easy', '{"text": "4 9 2"}', '[]', '492', 50, true),
  (memory_id, 'easy', '{"text": "8 3 5"}', '[]', '835', 50, true),
  (memory_id, 'medium', '{"text": "7 1 8 4 5"}', '[]', '71845', 100, true),
  (memory_id, 'medium', '{"text": "9 2 6 1 4"}', '[]', '92614', 100, true),
  (memory_id, 'hard', '{"text": "3 9 0 2 8 1 5"}', '[]', '3902815', 150, true);

END $$;
