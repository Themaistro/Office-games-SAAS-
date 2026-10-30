"use client";

import { useRef, useState } from "react";
import { Swords, X, CircleDot, ArrowRight, Loader2 } from "lucide-react";
import { createChessGame } from "@/app/dashboard/chess/actions";
import { createTttGame } from "@/app/dashboard/ttt/actions";
import { createConnectFourGame } from "@/app/dashboard/connect-four/actions";
import UnifiedLobbiesWidget from "./UnifiedLobbiesWidget";
import PartyLounge from './PartyLounge';
import { useToast } from "@/components/ui/ToastProvider";
import { GAME_TYPES, GAME_REGISTRY, type GameType } from "@/lib/game-registry";

const cards = {
  chess: { Icon: Swords, description: "Plan your next move. Choose your side and clock, then meet your opponent at the board.", detail: "Strategy · Custom clock" },
  ttt: { Icon: X, description: "A familiar game with room for a clever move. Make your line before your coworker does.", detail: "Quick play · Three in a row" },
  "connect-four": { Icon: CircleDot, description: "Build a line, block a threat, and turn one good drop into a winning connection.", detail: "Strategy · Four in a row" },
} satisfies Record<GameType, { Icon: typeof Swords; description: string; detail: string }>;

export default function UnifiedOfficeLounge({ currentUserId }: { currentUserId: string; loungeLp?: number }) {
  const [loading, setLoading] = useState<GameType | null>(null);
  const [showChessOptions, setShowChessOptions] = useState(false);
  const [chessColor, setChessColor] = useState<"white" | "black" | "random">("random");
  const [chessTime, setChessTime] = useState(600000);
  const lock = useRef(false);
  const { toast } = useToast();

  async function create(type: GameType) {
    if (lock.current) return;
    lock.current = true; setLoading(type);
    try {
      if (type === "chess") await createChessGame(chessColor, chessTime);
      else if (type === "ttt") await createTttGame();
      else await createConnectFourGame();
    } catch (error) {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
      toast(error instanceof Error ? error.message : "Could not create the match. Please try again.");
    } finally { lock.current = false; setLoading(null); }
  }

  return <div id="tour-office-lounge" className="space-y-8">
    <section aria-labelledby="choose-lounge-game">
      <div className="mb-5"><p className="match-eyebrow">Make your next move</p><h2 id="choose-lounge-game" className="mt-1 text-xl font-bold tracking-tight">Choose your game</h2><p className="mt-2 text-sm text-muted-foreground">Open a table for a coworker, or join a match below.</p></div>
      <div className="grid grid-cols-3 items-start gap-5">{GAME_TYPES.map(type => {
        const { Icon, description, detail } = cards[type];
        return <article key={type} className="match-panel flex min-h-[290px] flex-col p-6">
          <div className="flex items-center justify-between"><span className="match-game-icon"><Icon size={23}/></span><span className="text-xs font-semibold text-muted-foreground">1 vs 1</span></div>
          <h3 className="mt-5 text-xl font-black tracking-tight">{GAME_REGISTRY[type].label}</h3>
          <p className="mt-2 min-h-[60px] text-sm leading-6 text-muted-foreground">{description}</p>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">{detail}</p>
          {type === "chess" && showChessOptions ? <div className="mt-5 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-muted-foreground">Your side<select aria-label="Chess side" disabled={Boolean(loading)} value={chessColor} onChange={event => setChessColor(event.target.value as typeof chessColor)} className="mt-2 block w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground"><option value="random">Random</option><option value="white">White</option><option value="black">Black</option></select></label>
              <label className="text-xs font-bold text-muted-foreground">Clock<select aria-label="Chess clock" disabled={Boolean(loading)} value={chessTime} onChange={event => setChessTime(Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground">{[1,3,5,10,30].map(minutes => <option key={minutes} value={minutes*60000}>{minutes} min</option>)}</select></label>
            </div>
            <div className="mt-4 flex gap-2"><button className="match-button match-button-secondary" disabled={Boolean(loading)} onClick={() => setShowChessOptions(false)}>Cancel</button><button className="match-button match-button-primary flex-1" disabled={Boolean(loading)} onClick={() => void create(type)}>{loading === type ? <Loader2 size={16} className="animate-spin"/> : <ArrowRight size={16}/>}Create match</button></div>
          </div> : <button className="match-button match-button-primary mt-5 w-full" disabled={Boolean(loading)} onClick={() => type === "chess" ? setShowChessOptions(true) : void create(type)}>{loading === type ? <><Loader2 size={16} className="animate-spin"/>Creating…</> : <>Create match<ArrowRight size={16}/></>}</button>}
        </article>;
      })}</div>
    </section>
    <PartyLounge/>
    <UnifiedLobbiesWidget currentUserId={currentUserId}/>
  </div>;
}

