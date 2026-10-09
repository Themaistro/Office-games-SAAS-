"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Circle, Loader2, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelConnectFourGame, makeConnectFourMove } from "../actions";

export default function ConnectFourClient({ initialGame, currentUserId }: { initialGame: any; currentUserId: string }) {
  const [game, setGame] = useState(initialGame);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const me = game.red_player_id === currentUserId ? "R" : game.yellow_player_id === currentUserId ? "Y" : null;
  const myTurn = me === game.current_turn && game.status === "in_progress";
  useEffect(() => {
    if (["red_won", "yellow_won", "draw", "cancelled"].includes(game.status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/connect-four/${game.id}`, { cache: "no-store" });
      if (response.ok) setGame(await response.json());
    }, 2000);
    return () => window.clearInterval(timer);
  }, [game.id, game.status]);
  const move = async (column: number) => { if (!myTurn || busy) return; setBusy(true); try { await makeConnectFourMove(game.id, column); } catch (e) { alert(e instanceof Error ? e.message : "Move failed"); } finally { setBusy(false); } };
  const over = ["red_won", "yellow_won", "draw"].includes(game.status);
  return <main className="max-w-3xl mx-auto py-8 px-4 space-y-6">
    <div className="flex items-center justify-between"><button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 font-bold text-muted-foreground"><ArrowLeft size={18}/> Lounge</button><span className="rounded-full border px-4 py-2 text-sm font-black">{over ? game.status === "draw" ? "Draw" : game.status === `${me === "R" ? "red" : "yellow"}_won` ? "You win!" : "Match over" : game.status === "waiting" ? "Waiting for opponent" : myTurn ? "Your turn" : "Opponent's turn"}</span></div>
    <section className="rounded-3xl border bg-card p-5 shadow-xl"><div className="flex justify-between mb-5"><div className="font-black text-red-500">🔴 {game.red?.full_name || "Waiting"}</div><div className="font-black text-yellow-500">🟡 {game.yellow?.full_name || "Waiting"}</div></div><div className="grid grid-cols-7 gap-2 rounded-2xl bg-blue-600 p-3 sm:p-5">{game.board_state.split("").map((cell: string, index: number) => <button key={index} aria-label={`Column ${(index % 7) + 1}`} disabled={!myTurn || busy || cell !== "-"} onClick={() => move(index % 7)} className="aspect-square rounded-full bg-background/90 shadow-inner transition hover:scale-95 disabled:cursor-default">{cell === "R" && <Circle className="w-full h-full p-1 text-red-500 fill-red-500"/>}{cell === "Y" && <Circle className="w-full h-full p-1 text-yellow-400 fill-yellow-400"/>}</button>)}</div><div className="mt-5 flex justify-between text-sm text-muted-foreground"><span>{busy ? <><Loader2 className="inline animate-spin"/> Saving move…</> : "Choose a column"}</span>{over && <span className="font-black text-primary"><Trophy className="inline" size={16}/> Match complete</span>}</div></section>
    {game.status === "waiting" && game.red_player_id === currentUserId && <button onClick={async () => { await cancelConnectFourGame(game.id); router.push("/dashboard"); }} className="w-full rounded-xl bg-destructive py-3 font-bold text-destructive-foreground">Cancel lobby</button>}
  </main>;
}

