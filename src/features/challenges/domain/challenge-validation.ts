import { seededNumber, seededShuffle } from "./challenge-seed";
import { generateSudoku } from "./sudoku";
import { typingTimeLimit } from "./typing-rules";
import type { QuestionContent } from "./question-content";

type Challenge = {
  id: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  content: QuestionContent | null;
  correctAnswer: string;
};
export type ValidatedChallengeResult = {
  correct: boolean;
  accuracy: number;
  mistakes: number;
  correctAnswer: string;
};
export function validateChallenge(
  challenge: Challenge,
  answer: string,
  seconds: number,
): ValidatedChallengeResult {
  const { slug, difficulty } = challenge,
    content = challenge.content || {},
    seed = String(content.seed || challenge.id);
  const result = {
    correct: false,
    accuracy: 0,
    mistakes: 0,
    correctAnswer: challenge.correctAnswer,
  };
  if (!Number.isFinite(seconds) || seconds < 0 || answer.length > 20_000)
    return result;
  let evidence: unknown;
  try {
    evidence = JSON.parse(answer);
  } catch {
    evidence = null;
  }
  if (content.isCompanyTrivia || content.question || slug === "math") {
    result.correct =
      answer.trim().toLowerCase() ===
      challenge.correctAnswer.trim().toLowerCase();
  } else if (slug === "reaction") {
    const match = /^(\d+)ms$/.exec(answer),
      limit =
        difficulty === "easy" ? 1000 : difficulty === "medium" ? 600 : 400;
    result.correct = Boolean(
      match &&
      Number(match[1]) >= 50 &&
      Number(match[1]) <= limit &&
      Math.abs(Number(match[1]) / 1000 - seconds) < 0.2,
    );
  } else if (slug === "stroop") {
    const colors = [
      "RED",
      "BLUE",
      "GREEN",
      "YELLOW",
      "PURPLE",
      "ORANGE",
      "PINK",
      "CYAN",
    ];
    const word = seededNumber(seed, "word", colors.length);
    let font = seededNumber(seed, "font", colors.length);
    if (font === word) font = (font + 1) % colors.length;
    result.correctAnswer = colors[font];
    result.correct =
      answer === colors[font] &&
      seconds <= (difficulty === "easy" ? 10 : difficulty === "medium" ? 8 : 6);
  } else if (["mental_math", "mental-math"].includes(slug)) {
    const op = seededNumber(seed, "operation", 3);
    const a =
        seededNumber(seed, "a", op === 2 ? 10 : 50) +
        (op === 0 ? 10 : op === 1 ? 20 : 2),
      b =
        seededNumber(seed, "b", op === 0 ? 50 : op === 1 ? 20 : 10) +
        (op === 0 ? 10 : op === 1 ? 1 : 2);
    result.correctAnswer = String(op === 0 ? a + b : op === 1 ? a - b : a * b);
    result.correct = answer.trim() === result.correctAnswer;
  } else if (slug === "typing" || slug === "typing-challenge") {
    const expected = String(
        content.text || "The quick brown fox jumps over the lazy dog.",
      )
        .trim()
        .split(/\s+/),
      typed = answer.trim().split(/\s+/);
    result.accuracy =
      expected.filter((word, index) => word === typed[index]).length /
      Math.max(expected.length, typed.length);
    result.correct =
      result.accuracy >= 0.8 &&
      seconds <=
        typingTimeLimit(
          String(
            content.text || "The quick brown fox jumps over the lazy dog.",
          ),
          difficulty,
        );
  } else if (slug === "sequence") {
    const size = difficulty === "easy" ? 9 : difficulty === "medium" ? 16 : 25,
      length = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
    const expected = seededShuffle(
      Array.from({ length: size }, (_, i) => i),
      seed,
      "sequence-positions",
    ).slice(0, length);
    result.correct =
      Array.isArray(evidence) &&
      evidence.length === expected.length &&
      evidence.every((value, index) => value === expected[index]) &&
      seconds <= 15;
  } else if (slug === "card-match" || slug === "card_match") {
    const cards = content.cards as { emoji: string }[] | undefined;
    if (!cards?.length || !Array.isArray(evidence) || evidence.length > 2000)
      return result;
    const matched = new Set<number>();
    let mistakes = 0;
    for (const pair of evidence) {
      if (!Array.isArray(pair) || pair.length !== 2) return result;
      const [a, b] = pair;
      if (
        !Number.isInteger(a) ||
        !Number.isInteger(b) ||
        a === b ||
        !cards[a] ||
        !cards[b] ||
        matched.has(a) ||
        matched.has(b)
      )
        return result;
      if (cards[a].emoji === cards[b].emoji) {
        matched.add(a);
        matched.add(b);
      } else mistakes++;
    }
    result.correct =
      matched.size === cards.length &&
      seconds <=
        (difficulty === "easy" ? 63 : difficulty === "medium" ? 53 : 48);
    result.mistakes = mistakes;
  } else if (slug === "sudoku-lite" || slug === "sudoku_lite") {
    const { solution } = generateSudoku(difficulty, seed);
    result.correct =
      Array.isArray(evidence) &&
      evidence.length === 6 &&
      evidence.every(
        (row, index) =>
          Array.isArray(row) &&
          row.length === 6 &&
          row.every((value, column) => value === solution[index][column]),
      );
  } else if (slug === "odd-object" || slug === "odd_object") {
    const width = difficulty === "easy" ? 5 : difficulty === "medium" ? 7 : 9;
    result.correct =
      answer === String(seededNumber(seed, "odd-position", width * width)) &&
      seconds <= 15;
  } else {
    const expected =
      slug === "memory" ? String(content.text || "3819") : result.correctAnswer;
    result.correct =
      answer.trim().toLowerCase() === expected.trim().toLowerCase();
  }
  return result;
}
