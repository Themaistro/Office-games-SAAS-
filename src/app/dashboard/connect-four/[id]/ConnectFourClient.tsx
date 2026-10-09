"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Circle, Loader2, Trophy, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelConnectFourGame, makeConnectFourMove, resignConnectFourGame } from "../actions";
import { useToast } from "@/components/ui/ToastProvider";
import * as Ably from "ably";
import { getGameChannelName } from "@/lib/realtime";

export default function ConnectFourClient({ initialGame, currentUserId }: { initialGame: any; currentUserId: string }) {
  const [game, setGame] = useState(initialGame);
  const [spectators, setSpectators] = useState<any[]>(initialGame.spectators || []);
  const [busy, setBusy] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const me = game.red_player_id === currentUserId ? "R" : game.yellow_player_id === currentUserId ? "Y" : null;
  const myTurn = me === game.current_turn && game.status === "in_progress";
  useEffect(() => {
    if (["red_won", "yellow_won", "draw", "cancelled"].includes(game.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/connect-four/${game.id}`, { cache: "no-store" });
        if (!response.ok) { setConnectionIssue(true); return; }
        const next = await response.json();
        setConnectionIssue(false);
        setGame(next);
        setSpectators(next.spectators || []);
      } catch { setConnectionIssue(true); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.id, game.status]);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) return;
    const realtime = new Ably.Realtime({ key, echoMessages: false });
    const channel = realtime.channels.get(getGameChannelName("connect-four", game.id));
    const handleMessage = (message: Ably.Message) => {
      const event = message.data as { senderId?: string; payload?: { board?: string; currentTurn?: string; status?: string } };
      if (event.senderId === currentUserId || !event.payload?.board) return;
      setGame((current: any) => ({ ...current, board_state: event.payload?.board, current_turn: event.payload?.currentTurn, status: event.payload?.status }));
      setBusy(false);
    };
    void channel.subscribe(handleMessage).catch(() => setConnectionIssue(true));
    return () => { try { channel.unsubscribe(handleMessage); } catch {} try { realtime.close(); } catch {} };
  }, [game.id, currentUserId]);
  const move = async (column: number) => {
    if (!myTurn || busy) return;
    const previous = game;
    const board = game.board_state.split("");
    for (let row = 5; row >= 0; row--) {
      const index = row * 7 + column;
      if (board[index] === "-") { board[index] = me; break; }
    }
    setGame({ ...game, board_state: board.join(""), current_turn: me === "R" ? "Y" : "R" });
    setBusy(true);
    try { await makeConnectFourMove(game.id, column); }
    catch (e) { setGame(previous); toast(e instanceof Error ? e.message : "Move failed"); }
    finally { setBusy(false); }
  };
  const over = ["red_won", "yellow_won", "draw"].includes(game.status);
  const resign = async () => { if (!window.confirm("Resign this match? Your opponent will win.")) return; setBusy(true); try { await resignConnectFourGame(game.id); const response = await fetch(`/api/connect-four/${game.id}`, { cache: "no-store" }); if (response.ok) setGame(await response.json()); } catch (e) { toast(e instanceof Error ? e.message : "Could not resign"); } finally { setBusy(false); } };
  return <main className="max-w-3xl mx-auto py-8 px-4 space-y-6">
    <div className="flex items-center justify-between"><button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 font-bold text-muted-foreground"><ArrowLeft size={18}/> Lounge</button><span className="rounded-full border px-4 py-2 text-sm font-black">{over ? game.status === "draw" ? "Draw" : game.status === `${me === "R" ? "red" : "yellow"}_won` ? "You win!" : "Match over" : game.status === "waiting" ? "Waiting for opponent" : myTurn ? "Your turn" : "Opponent's turn"}</span></div>
    {connectionIssue && <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700">Connection is unstable. We’re trying to reconnect to this match…</div>}
    <section className="rounded-3xl border bg-card p-5 shadow-xl"><div className="flex justify-between mb-5"><div className="font-black text-red-500">🔴 {game.red?.full_name || "Waiting"}</div><div className="font-black text-yellow-500">🟡 {game.yellow?.full_name || "Waiting"}</div></div>{!me && <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm font-bold text-muted-foreground"><Eye className="mr-2 inline" size={16}/>You are watching this match.</div>}<div className="grid grid-cols-7 gap-2 rounded-2xl bg-blue-600 p-3 sm:p-5">{game.board_state.split("").map((cell: string, index: number) => <button key={index} aria-label={`Column ${(index % 7) + 1}`} disabled={!myTurn || busy || cell !== "-"} onClick={() => move(index % 7)} className="aspect-square rounded-full bg-background/90 shadow-inner transition hover:scale-95 disabled:cursor-default">{cell === "R" && <Circle className="w-full h-full p-1 text-red-500 fill-red-500"/>}{cell === "Y" && <Circle className="w-full h-full p-1 text-yellow-400 fill-yellow-400"/>}</button>)}</div><div className="mt-5 flex justify-between text-sm text-muted-foreground"><span>{busy ? <><Loader2 className="inline animate-spin"/> Saving move…</> : "Choose a column"}</span>{over && <span className="font-black text-primary"><Trophy className="inline" size={16}/> Match complete</span>}</div>{spectators.length > 0 && <div className="mt-4 text-center text-xs font-bold text-muted-foreground"><Eye className="mr-1 inline" size={14}/>{spectators.length} spectator{spectators.length === 1 ? "" : "s"} watching</div>}</section>
    {game.status === "in_progress" && me && <button disabled={busy} onClick={resign} className="w-full rounded-xl border border-destructive/30 bg-destructive/10 py-3 font-bold text-destructive hover:bg-destructive/15 disabled:opacity-50">Resign match</button>}
    {game.status === "waiting" && game.red_player_id === currentUserId && <button onClick={async () => { await cancelConnectFourGame(game.id); router.push("/dashboard"); }} className="w-full rounded-xl bg-destructive py-3 font-bold text-destructive-foreground">Cancel lobby</button>}
  </main>;
}

