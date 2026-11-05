export interface ScoreBreakdown {
  base: number;
  speed: number;
  noHint: number;
  perfect: number;
  combo: number;
}

export interface FeedbackState {
  isCorrect: boolean;
  xpEarned: number;
  correctAnswer: string;
  isPerformance?: boolean;
  breakdown?: ScoreBreakdown;
  isSkipped?: boolean;
  failureReason?: "timeout" | "early" | "incorrect";
}

export function getPerformanceMessage(
  slug: string,
  isCorrect: boolean,
  reason?: FeedbackState["failureReason"],
) {
  if (!isCorrect && slug === "reaction" && reason === "early")
    return {
      title: "Too soon!",
      detail: "Wait for the green flash before clicking.",
    };
  if (!isCorrect && ["odd_object", "odd-object"].includes(slug))
    return reason === "timeout"
      ? {
          title: "Time ran out",
          detail:
            "You did not find the different object before the timer ended.",
        }
      : {
          title: "Not that one",
          detail:
            "You selected a matching object. Look for the one that is different.",
        };
  const messages: Record<string, [string, string]> = {
    reaction: ["Great catch!", "You caught the green flash."],
    stroop: ["Sharp focus!", "You matched the ink color correctly."],
    typing: ["Clean typing!", "You completed the passage with good accuracy."],
    "typing-challenge": [
      "Clean typing!",
      "You completed the passage with good accuracy.",
    ],
    sequence: ["Sequence cracked!", "You remembered the pattern."],
    memory: ["Memory unlocked!", "You recalled the hidden pattern."],
    sudoku_lite: ["Puzzle solved!", "You completed the grid."],
    "sudoku-lite": ["Puzzle solved!", "You completed the grid."],
    "card-match": ["All matched!", "You found the pairs."],
    card_match: ["All matched!", "You found the pairs."],
    odd_object: ["Great eye!", "You spotted the odd object."],
    "odd-object": ["Great eye!", "You spotted the odd object."],
    mental_math: ["Quick maths!", "You solved the calculation."],
    "mental-math": ["Quick maths!", "You solved the calculation."],
    math: ["Number cruncher!", "You found the right result."],
    logic: ["Logic locked in!", "You solved the reasoning challenge."],
    word: ["Word wizard!", "You found the right word."],
    unscramble: ["Word unscrambled!", "You put the letters in order."],
    "word-unscramble": ["Word unscrambled!", "You put the letters in order."],
  };
  const [success, failure] = messages[slug] || [
    "Nice work!",
    "You completed the challenge.",
  ];
  if (isCorrect) return { title: success, detail: failure };

  const failures: Record<string, [string, string]> = {
    reaction: [
      "You missed the flash",
      "You were not fast enough. Wait for green and react as quickly as you can.",
    ],
    stroop: [
      "Focus slipped",
      "The ink color and word were designed to conflict. Trust the ink color next time.",
    ],
    typing: [
      "Keep practicing",
      "The passage was not completed accurately before time ran out.",
    ],
    "typing-challenge": [
      "Keep practicing",
      "The passage was not completed accurately before time ran out.",
    ],
    sequence: [
      "Sequence missed",
      "The pattern was not completed in the correct order.",
    ],
    memory: [
      "Memory slipped",
      "The sequence did not match. Take another moment to lock it in next time.",
    ],
    "card-match": [
      "Time ran out",
      "Not every pair was found before the countdown ended.",
    ],
    card_match: [
      "Time ran out",
      "Not every pair was found before the countdown ended.",
    ],
    sudoku_lite: [
      "Grid incomplete",
      "The Sudoku grid was not solved correctly.",
    ],
    "sudoku-lite": [
      "Grid incomplete",
      "The Sudoku grid was not solved correctly.",
    ],
    odd_object: [
      "Wrong object",
      "The odd object was not identified before the timer ended.",
    ],
    "odd-object": [
      "Wrong object",
      "The odd object was not identified before the timer ended.",
    ],
  };
  const [title, detail] = failures[slug] || [
    "Not this time",
    "The challenge was not completed successfully.",
  ];
  return { title, detail };
}
