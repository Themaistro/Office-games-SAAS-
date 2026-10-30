"use client";

import Link from "next/link";
import { ArrowLeft, Trophy, WifiOff, Swords, Eye, Target, Check } from "lucide-react";
import { getLoungeRank } from "@/lib/lounge-ranks";
import type { ReactNode } from "react";

export function MatchToolbar({ title, status, disconnected, finished = false, icon, subtitle = "Lounge match · 1 vs 1" }: { title: string; status: string; disconnected?: boolean; finished?: boolean; icon?: ReactNode; subtitle?: string }) {
  return <><header className="match-toolbar"><div><Link href="/office-lounge" className="match-back"><ArrowLeft size={16}/>Office Lounge</Link><div className="mt-3 flex items-center gap-3"><span className="match-game-icon">{icon || <Swords size={22}/>}</span><div><p className="match-eyebrow">{subtitle}</p><h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1></div></div></div><p role="status" className="match-status">{finished ? <Check size={15}/> : <span className="h-2 w-2 rounded-full bg-current"/>}{status}</p></header>{disconnected && <p role="status" className="match-reconnect"><WifiOff size={16}/>Reconnecting… Your last saved move is safe.</p>}</>;
}

export function MatchPlayer({ name, side, active, lp, avatar, children, detail }: { name?: string; side: string; active: boolean; lp?: number; avatar?: string; children?: ReactNode; detail?: string }) {
  const rank = lp === undefined ? null : getLoungeRank(lp);
  return <div className={`match-player ${active ? "match-player-active" : ""}`}><span className="match-avatar">{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover"/> : (name?.charAt(0) || "?")}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{name || "Waiting for a player"}</p>{active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Active turn"/>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{side}{rank ? ` · ${rank.name} ${rank.lp} LP` : ""}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>{children}</div>;
}

export function MatchResult({ title, children, description = "Match complete. The final board stays open for review." }: { title: string; children?: ReactNode; description?: string }) {
  return <section className="match-result" aria-label="Match result"><div className="flex items-start gap-3"><span className="match-game-icon"><Trophy size={22}/></span><div><p className="match-eyebrow">Final result</p><h2 className="mt-1 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div></div><div className="mt-5 flex flex-wrap items-center gap-3">{children}<Link href="/office-lounge" className="match-button match-button-secondary">Back to Lounge</Link></div></section>;
}

export function MatchSpectator({ count }: { count?: number }) {
  return <p className="match-spectator"><Eye size={16}/>Spectator mode · watch the match live{count !== undefined && count > 0 ? ` · ${count} watching` : ""}</p>;
}

export function MatchGuide({ objective, tips, children }: { objective: string; tips: string[]; children?: ReactNode }) {
  return <aside className="match-panel h-fit p-6"><p className="match-eyebrow">How to play</p><div className="mt-3 flex items-start gap-3"><Target size={21} className="mt-0.5 shrink-0 text-primary"/><h2 className="text-lg font-bold leading-6">{objective}</h2></div><ol className="mt-5 space-y-4">{tips.map((tip,index) => <li key={tip} className="flex gap-3 text-sm leading-6 text-muted-foreground"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-secondary/60 text-xs font-bold text-foreground">{index+1}</span>{tip}</li>)}</ol>{children && <div className="mt-6 border-t border-border pt-5">{children}</div>}</aside>;
}

export function winningCells(board: string, width: number, needed: number): number[] {
  const height = board.length / width;
  for (let row=0;row<height;row++) for (let col=0;col<width;col++) {
    const token=board[row*width+col]; if(token==="-")continue;
    for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
      const cells:number[]=[];
      for(let i=0;i<needed;i++){const x=col+i*dx,y=row+i*dy;if(x<0||x>=width||y<0||y>=height||board[y*width+x]!==token)break;cells.push(y*width+x);}
      if(cells.length===needed)return cells;
    }
  }
  return [];
}
