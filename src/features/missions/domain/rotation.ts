export type MissionGame = { id: string; slug: string; name: string };

const gameCategory = (slug: string) => {
  if (
    [
      "trivia",
      "coding",
      "typing",
      "word",
      "unscramble",
      "word-unscramble",
    ].includes(slug)
  )
    return "knowledge";
  if (
    [
      "memory",
      "sequence",
      "card_match",
      "card-match",
      "reaction",
      "stroop",
    ].includes(slug)
  )
    return "reflex";
  if (
    [
      "logic",
      "sudoku_lite",
      "sudoku-lite",
      "odd_object",
      "odd-object",
    ].includes(slug)
  )
    return "logic";
  if (["math", "mental_math", "mental-math"].includes(slug)) return "math";
  return "other";
};

const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function buildDailyLineup(
  date: string,
  games: MissionGame[],
  count: number,
  history: string[][],
) {
  const seed = stableHash(`office-games:${date}`);
  const recentTwoDays = new Set(history.slice(0, 2).flat());
  const preferredPool = games.filter((game) => !recentTwoDays.has(game.id));
  const pool = preferredPool.length >= count ? preferredPool : games;
  let best: { games: MissionGame[]; score: number } | null = null;

  for (let attempt = 0; attempt < 256; attempt += 1) {
    const ranked = [...pool].sort(
      (left, right) =>
        stableHash(`${seed}:${attempt}:${left.id}`) -
        stableHash(`${seed}:${attempt}:${right.id}`),
    );
    const selected: MissionGame[] = [];
    const categories = new Set(selected.map((game) => gameCategory(game.slug)));

    for (const game of ranked) {
      if (selected.length >= count) break;
      const category = gameCategory(game.slug);
      if (
        !selected.some((selectedGame) => selectedGame.id === game.id) &&
        !categories.has(category)
      ) {
        selected.push(game);
        categories.add(category);
      }
    }
    for (const game of ranked) {
      if (selected.length >= count) break;
      if (!selected.some((selectedGame) => selectedGame.id === game.id))
        selected.push(game);
    }

    const key = selected
      .map((game) => game.id)
      .sort()
      .join(",");
    let score = categories.size * 100;
    history.forEach((previous, index) => {
      const overlap = selected.filter((game) =>
        previous.includes(game.id),
      ).length;
      score -= overlap * Math.max(1, 20 - index);
      if (previous.slice().sort().join(",") === key) score -= 10000;
    });
    if (!best || score > best.score) best = { games: selected, score };
  }
  const ordered = [...(best?.games || games.slice(0, count))].sort(
    (left, right) =>
      stableHash(`${seed}:order:${left.id}`) -
      stableHash(`${seed}:order:${right.id}`),
  );
  if (
    ordered.length > 1 &&
    history[0]?.join(",") === ordered.map((game) => game.id).join(",")
  )
    ordered.push(ordered.shift()!);
  return { seed, games: ordered };
}
