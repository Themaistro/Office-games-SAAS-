-- Reference catalog only: never overwrite an admin's availability or rounds.
INSERT INTO game_types(name,slug,description,is_active,easy_rounds,medium_rounds,hard_rounds) VALUES
 ('Card Match','card_match','Find matching pairs as fast as possible',true,1,1,1),
 ('Coding','coding','Everyday coding and computing knowledge',true,1,1,1),
 ('Logic','logic','Reason through a short puzzle',true,1,1,1),
 ('Math','math','Find the target number',true,1,1,1),
 ('Memory','memory','Remember and recall a sequence',true,1,1,1),
 ('Mental Math','mental_math','Solve a quick calculation',true,1,1,1),
 ('Odd Object','odd_object','Find the object that is different',true,1,1,1),
 ('Reaction','reaction','Catch the green flash',true,1,1,1),
 ('Sequence','sequence','Remember the order of the tiles',true,1,1,1),
 ('Speed Typing','typing','Type a short passage accurately',true,1,1,1),
 ('Stroop','stroop','Match the ink color, not the word',true,1,1,1),
 ('Sudoku Lite','sudoku_lite','Complete a six-by-six Sudoku',true,1,1,1),
 ('Trivia','trivia','Test your general knowledge',true,1,1,1),
 ('Word','word','Find the missing letters',true,1,1,1),
 ('Word Unscramble','unscramble','Put the letters in order',true,1,1,1)
ON CONFLICT(slug) DO NOTHING;
