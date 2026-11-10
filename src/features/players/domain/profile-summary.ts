export type ProfileGameStats = {
  name: string;
  slug: string;
  plays: number;
  avgScore: number;
  accuracy: number;
};

export function profileProgress(level: number, xp: number) {
  const currentLevel = Math.max(1, level || 1);
  const nextLevelXp = currentLevel * 1200;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((xp - (currentLevel - 1) * 1200) / 1200) * 100)),
  );
  const tier =
    currentLevel >= 10 ? 3 : currentLevel >= 5 ? 2 : currentLevel >= 3 ? 1 : 0;
  return {
    nextLevelXp,
    progressPercent,
    userTitle: ["Rookie", "Apprentice", "Brainiac", "Mastermind"][tier],
    themeColor: [
      "from-primary/10 to-accent/5",
      "from-orange-500/10 to-amber-600/5",
      "from-slate-400/20 to-slate-600/10",
      "from-yellow-500/20 to-amber-700/10",
    ][tier],
    borderColor: [
      "border-border/50",
      "border-orange-500/30",
      "border-slate-400/50",
      "border-yellow-500/50",
    ][tier],
    glowEffect: [
      "",
      "",
      "shadow-[0_0_30px_-10px_rgba(148,163,184,0.3)]",
      "shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]",
    ][tier],
  };
}

/** Observed challenge accuracy only; no invented IQ/cognitive assessment. */
export function challengeRadar(stats: ProfileGameStats[]) {
  const groups = [
    ["Memory", ["memory", "sequence", "card_match"]],
    ["Speed", ["reaction", "typing", "stroop"]],
    ["Logic", ["logic", "math", "mental_math", "sudoku_lite"]],
    ["Trivia", ["trivia", "company_trivia"]],
    ["Overall", []],
  ] as const;
  return groups.map(([subject, slugs]) => {
    const selected =
      subject === "Overall"
        ? stats
        : stats.filter((item) =>
            (slugs as readonly string[]).includes(
              item.slug.replaceAll("-", "_"),
            ),
          );
    const plays = selected.reduce((total, item) => total + item.plays, 0);
    return {
      subject,
      A: plays
        ? Math.round(
            selected.reduce(
              (total, item) => total + item.accuracy * item.plays,
              0,
            ) / plays,
          )
        : 0,
      fullMark: 100,
    };
  });
}
