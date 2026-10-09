import { getLoungeRank, getLoungeRankStyle, LOUNGE_RANKS } from "@/lib/lounge-ranks";

export default function LoungeRankCard({ loungeLp = 0 }: { loungeLp?: number }) {
  const rank = getLoungeRank(loungeLp);
  const style = getLoungeRankStyle(rank.name);
  const nextRank = LOUNGE_RANKS[LOUNGE_RANKS.indexOf(rank.name as typeof LOUNGE_RANKS[number]) + 1];
  const progress = Math.min(100, rank.lp);

  return <section className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${style.badge}`}>
    <div className="absolute -right-8 -top-10 text-8xl opacity-10">{style.mark}</div>
    <div className="relative flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Your Lounge standing</p>
        <div className={`mt-2 flex items-center gap-2 text-2xl font-black ${style.text}`}><span className="text-3xl">{style.mark}</span>{rank.name}</div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{nextRank ? `${100 - rank.lp} LP to ${nextRank}` : "You are at the top of the ladder"}</p>
      </div>
      <div className="text-right"><p className={`text-2xl font-black ${style.text}`}>{rank.lp}</p><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">LP / 100</p></div>
    </div>
    <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-background/70"><div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${progress}%` }} /></div>
  </section>;
}
