"use client";

import { useEffect, useState } from "react";
import { Clock3, History, Swords, CircleDot, X } from "lucide-react";

type Entry = { id: string; type: "chess" | "ttt" | "connect-four"; status: string; created_at: string; other_player_id: string | null };

const label = (type: Entry["type"]) => type === "chess" ? "Chess" : type === "ttt" ? "Tic Tac Toe" : "Connect Four";
const statusLabel = (status: string) => status === "waiting" ? "Pending" : status === "in_progress" ? "Live" : status === "draw" ? "Draw" : status.replaceAll("_", " ");

export default function ChallengeHistoryWidget() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<"all" | "waiting" | "in_progress" | "completed">("all");
  useEffect(() => { const load = async () => { const response = await fetch("/api/challenges?history=1", { cache: "no-store" }); if (response.ok) setEntries(await response.json()); }; load(); const timer = window.setInterval(load, 10000); return () => window.clearInterval(timer); }, []);
  const visible = entries.filter((entry) => filter === "all" || (filter === "completed" ? !["waiting", "in_progress"].includes(entry.status) : entry.status === filter));
  return <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h3 className="flex items-center gap-2 font-black"><History size={17} className="text-primary"/> Your challenges</h3><p className="mt-1 text-xs text-muted-foreground">Recent invites and matches</p></div><Clock3 size={16} className="text-muted-foreground"/></div><div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-secondary/60 p-1">{([["all", "All"], ["waiting", "Pending"], ["in_progress", "Live"], ["completed", "Done"]] as const).map(([value, text]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-1 py-1.5 text-[10px] font-black ${filter === value ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{text}</button>)}</div>{visible.length ? <div className="space-y-2">{visible.slice(0, 6).map((entry) => <div key={`${entry.type}-${entry.id}-${entry.created_at}`} className="flex items-center gap-3 rounded-2xl bg-background/60 px-3 py-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">{entry.type === "chess" ? <Swords size={15}/> : entry.type === "ttt" ? <X size={15}/> : <CircleDot size={15}/>}</span><span className="min-w-0 flex-1"><span className="block text-xs font-black">{label(entry.type)}</span><span className="block truncate text-[11px] capitalize text-muted-foreground">{statusLabel(entry.status)}</span></span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${entry.status === "waiting" ? "bg-amber-500/10 text-amber-700" : entry.status === "in_progress" ? "bg-emerald-500/10 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>{statusLabel(entry.status)}</span></div>)}</div> : <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No challenges in this view.</p>}</section>;
}
