import { scoreMissionAttempt } from "../domain/scoring";

export interface AttemptSnapshot {
  id: string;
  question_id: string;
  difficulty: "easy" | "medium" | "hard";
  hint_used: boolean;
  is_completed: boolean;
  correct_answer: string;
  base_xp: number;
  content: Record<string, unknown> | null;
  game_slug: string;
  user_id: string;
  session_status: string;
  session_created_at: string;
  allowed_duration_seconds: number;
}
export interface AnswerRepository {
  find(id: string): Promise<AttemptSnapshot | null>;
  earlierPending(id: string): Promise<boolean>;
  complete(
    id: string,
    values: { outcome: string; earnedXp: number; seconds: number },
  ): Promise<boolean>;
}
export interface ChallengeValidator {
  (
    challenge: {
      id: string;
      slug: string;
      difficulty: AttemptSnapshot["difficulty"];
      content: Record<string, unknown> | null;
      correctAnswer: string;
    },
    answer: string,
    seconds: number,
  ): {
    correct: boolean;
    correctAnswer: string;
    mistakes: number;
    accuracy: number;
  };
}

export function createMissionAnswerer(
  repository: AnswerRepository,
  validate: ChallengeValidator,
  now = Date.now,
) {
  return async (
    userId: string,
    id: string,
    answer: string,
    seconds: number,
    skipped = false,
  ) => {
    const row = await repository.find(id);
    if (!row) throw new Error("Question not found");
    if (row.user_id !== userId) throw new Error("Unauthorized");
    if (row.is_completed)
      return { success: false as const, error: "Already answered" };
    if (await repository.earlierPending(id))
      return {
        success: false as const,
        error: "Complete the current challenge first",
      };
    if (
      row.session_status !== "in_progress" ||
      now() >=
        new Date(row.session_created_at).getTime() +
          row.allowed_duration_seconds * 1000
    )
      return { success: false as const, error: "Mission time has expired" };
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600)
      throw new Error("Invalid answer timing");
    if (typeof answer !== "string" || answer.length > 20_000)
      throw new Error("Invalid answer");
    let correctAnswer = String(row.correct_answer);
    if (
      ["word-unscramble", "unscramble"].includes(row.game_slug) &&
      !row.content?.scrambled
    )
      correctAnswer = "SYNERGY";
    else if (row.game_slug === "memory" && !row.content?.text)
      correctAnswer = "3819";
    const result = validate(
      {
        id: row.question_id,
        slug: row.game_slug,
        difficulty: row.difficulty,
        content: row.content,
        correctAnswer,
      },
      answer,
      seconds,
    );
    const isCorrect = !skipped && result.correct;
    const score = scoreMissionAttempt({
      slug: row.game_slug,
      correct: isCorrect,
      skipped,
      baseXp: row.base_xp || 100,
      seconds,
      hintUsed: row.hint_used,
      mistakes: result.mistakes,
      accuracy: result.accuracy,
    });
    const saved = await repository.complete(id, {
      outcome: skipped
        ? "skipped"
        : isCorrect
          ? "correct"
          : /timeout|time.out|time's up|missed/i.test(answer)
            ? "timed_out"
            : "incorrect",
      earnedXp: score.xpEarned,
      seconds: Math.round(seconds),
    });
    if (!saved) {
      const latest = await repository.find(id);
      const expired =
        latest &&
        (latest.session_status !== "in_progress" ||
          now() >=
            new Date(latest.session_created_at).getTime() +
              latest.allowed_duration_seconds * 1000);
      return {
        success: false as const,
        error: expired ? "Mission time has expired" : "Already answered",
      };
    }
    return {
      success: true as const,
      isCorrect,
      ...score,
      correctAnswer: result.correctAnswer,
    };
  };
}
