import type {
  QuestionContent,
  ChallengePayloads,
} from "@/features/challenges/domain/question-content";
export type Difficulty = "easy" | "medium" | "hard";

export type GameTypeSlug =
  | "logic"
  | "word"
  | "memory"
  | "observation"
  | "speed"
  | "trivia"
  | "company_trivia"
  | "reaction"
  | "stroop"
  | "sequence"
  | "card_match"
  | "card-match"
  | "sudoku_lite"
  | "sudoku-lite"
  | "odd_object"
  | "odd-object"
  | "unscramble"
  | "word-unscramble"
  | "typing"
  | "typing-challenge"
  | "mental_math"
  | "mental-math"
  | "math"
  | "coding";

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
  content: QuestionContent;
  options: string[];
  correct_answer: string;
  hint_options?: string[];
  explanation?: string;
  base_xp: number;
}
export type QuestionFor<T extends keyof ChallengePayloads> = Omit<
  Question,
  "content"
> & { content: ChallengePayloads[T] };

export interface SessionQuestion {
  id: string;
  session_id: string;
  question_id: string;
  order_index: number;
  is_completed: boolean;
  outcome?: "correct" | "incorrect" | "skipped" | "timed_out" | null;
  hint_used?: boolean;
  earned_xp?: number;
  question: Question;
}

export interface GameProps {
  question: Question;
  onAnswer: (
    answer: string,
    options?: {
      customIsCorrect?: boolean;
      customTimeSpent?: number;
      isPerfect?: boolean;
      isSkipped?: boolean;
      dynamicCorrectAnswer?: string;
      customScoreModifiers?: {
        mistakes?: number;
        customSpeedBonus?: number;
        accuracy?: number;
      };
    },
  ) => void;
  isSubmitting?: boolean;
  showHint?: boolean;
}

export type GameComponentProps = GameProps;
