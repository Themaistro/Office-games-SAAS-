export interface MissionAttempt {
  slug: string;
  correct: boolean;
  skipped: boolean;
  baseXp: number;
  seconds: number;
  hintUsed: boolean;
  mistakes: number;
  accuracy: number;
}

/** Takes server-validated results only. Client claims must never award XP. */
export function scoreMissionAttempt(attempt: MissionAttempt) {
  const breakdown = { base: 0, speed: 0, noHint: 0, perfect: 0, combo: 0 };
  if (attempt.skipped) breakdown.base = -50;
  else if (attempt.correct) {
    const { slug, baseXp, seconds, hintUsed } = attempt;
    if (["card-match", "card_match"].includes(slug)) {
      const mistakes = Math.min(100, Math.max(0, Math.floor(attempt.mistakes)));
      breakdown.base = Math.max(0, baseXp - mistakes * 5);
      breakdown.speed = Math.floor(Math.max(0, 60 - seconds));
    } else if (["typing", "typing-challenge"].includes(slug)) {
      const accuracy = Math.min(1, Math.max(0, attempt.accuracy));
      breakdown.base = Math.max(0, Math.floor(baseXp * accuracy));
      breakdown.speed =
        accuracy === 1 ? Math.floor(Math.max(0, 30 - seconds)) : 0;
      if (attempt.accuracy === 1 && !hintUsed) breakdown.perfect = 50;
    } else {
      breakdown.base = baseXp;
      if (seconds <= 5) breakdown.speed = 25;
    }
    if (
      !hintUsed &&
      ![
        "reaction",
        "stroop",
        "typing",
        "typing-challenge",
        "sequence",
      ].includes(slug)
    ) {
      breakdown.noHint = 20;
    }
  }
  return {
    xpEarned: Object.values(breakdown).reduce((sum, value) => sum + value, 0),
    breakdown,
  };
}
