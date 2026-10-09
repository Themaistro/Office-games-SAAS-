export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameTypeSlug = 'logic' | 'word' | 'memory' | 'observation' | 'speed' | 'trivia' | 'company_trivia' | 'reaction' | 'stroop' | 'sequence' | 'card_match' | 'card-match' | 'sudoku_lite' | 'sudoku-lite' | 'odd_object' | 'odd-object' | 'unscramble' | 'word-unscramble' | 'typing' | 'typing-challenge' | 'mental_math' | 'mental-math' | 'math' | 'coding';

export interface GameType {
  id: string;
  name: string;
  slug: GameTypeSlug;
  description: string;
}

export interface Question {
  id: string;
  game_type_id: string;
  game_type: GameType;
  difficulty: Difficulty;
  content: any; // Format depends on game type
  options: any[]; // Usually string[]
  correct_answer: string;
  explanation?: string;
  base_xp: number;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  question_id: string;
  order_index: number;
  is_completed: boolean;
  question: Question;
}

export interface GameProps {
  question: Question;
  onAnswer: (
    answer: string, 
    optionsOrIsCorrect?: boolean | { 
      customIsCorrect?: boolean; 
      customTimeSpent?: number; 
      isPerfect?: boolean;
      isSkipped?: boolean;
      dynamicCorrectAnswer?: string;
      customScoreModifiers?: { mistakes?: number; customSpeedBonus?: number; accuracy?: number };
    }, 
    timeTakenSeconds?: number
  ) => void;
  isSubmitting?: boolean;
  showHint?: boolean;
}

export type GameComponentProps = GameProps;
