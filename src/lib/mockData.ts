import { SessionQuestion } from "@/types/game";

export const MOCK_SESSION_QUESTIONS: SessionQuestion[] = [
  {
    id: "sq1",
    session_id: "session1",
    order_index: 0,
    is_completed: false,
    question_id: "q1",
    question: {
      id: "q1",
      game_type_id: "gt1",
      game_type: { id: "gt1", name: "Logic", slug: "logic", description: "Logic puzzles" },
      difficulty: "medium",
      content: { text: "2, 4, 8, 16, ?" },
      options: ["18", "24", "32", "64"],
      correct_answer: "32",
      base_xp: 100,
    }
  },
  {
    id: "sq2",
    session_id: "session1",
    order_index: 1,
    is_completed: false,
    question_id: "q2",
    question: {
      id: "q2",
      game_type_id: "gt2",
      game_type: { id: "gt2", name: "Trivia", slug: "trivia", description: "General Knowledge" },
      difficulty: "easy",
      content: { text: "Which planet is known as the Red Planet?" },
      options: ["Venus", "Jupiter", "Mars", "Saturn"],
      correct_answer: "Mars",
      base_xp: 100,
    }
  },
  {
    id: "sq3",
    session_id: "session1",
    order_index: 2,
    is_completed: false,
    question_id: "q3",
    question: {
      id: "q3",
      game_type_id: "gt3",
      game_type: { id: "gt3", name: "Word", slug: "word", description: "Word puzzles" },
      difficulty: "medium",
      content: { text: "t n o i a c" },
      options: ["ACTION", "NATION", "CANTON", "OCTANT"],
      correct_answer: "ACTION",
      base_xp: 100,
    }
  },
  {
    id: "sq4",
    session_id: "session1",
    order_index: 3,
    is_completed: false,
    question_id: "q4",
    question: {
      id: "q4",
      game_type_id: "gt4",
      game_type: { id: "gt4", name: "Memory", slug: "memory", description: "Memory tests" },
      difficulty: "hard",
      content: { text: "9 4 7 1" },
      options: [],
      correct_answer: "9471",
      base_xp: 150,
    }
  }
];
