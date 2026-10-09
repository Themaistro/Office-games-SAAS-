export const LOUNGE_RANKS = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
] as const;

export function getLoungeRank(lp: number | null | undefined) {
  const points = Math.max(0, Math.floor(lp ?? 0));
  const rankIndex = Math.min(Math.floor(points / 100), LOUNGE_RANKS.length - 1);
  return { name: LOUNGE_RANKS[rankIndex], lp: points % 100, totalLp: points };
}

export function getLoungeRankStyle(rank: string) {
  const styles: Record<string, { badge: string; text: string; bar: string; mark: string }> = {
    Bronze: { badge: "bg-orange-500/10 border-orange-500/20", text: "text-orange-700", bar: "bg-orange-500", mark: "◆" },
    Silver: { badge: "bg-slate-400/10 border-slate-400/20", text: "text-slate-600", bar: "bg-slate-400", mark: "◆" },
    Gold: { badge: "bg-amber-500/10 border-amber-500/20", text: "text-amber-700", bar: "bg-amber-500", mark: "◆" },
    Platinum: { badge: "bg-cyan-500/10 border-cyan-500/20", text: "text-cyan-700", bar: "bg-cyan-500", mark: "◆" },
    Diamond: { badge: "bg-blue-500/10 border-blue-500/20", text: "text-blue-700", bar: "bg-blue-500", mark: "✦" },
    Master: { badge: "bg-violet-500/10 border-violet-500/20", text: "text-violet-700", bar: "bg-violet-500", mark: "✦" },
    Grandmaster: { badge: "bg-pink-500/10 border-pink-500/20", text: "text-pink-700", bar: "bg-pink-500", mark: "✦" },
    Challenger: { badge: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-700", bar: "bg-emerald-500", mark: "♛" },
  };
  return styles[rank] || styles.Bronze;
}
