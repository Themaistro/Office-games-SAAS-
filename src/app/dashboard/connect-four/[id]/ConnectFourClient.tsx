"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, CircleDot } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  cancelConnectFourGame,
  makeConnectFourMove,
  resignConnectFourGame,
  challengeUserToConnectFour,
} from "../actions";
import { useMatchAction } from "@/hooks/useMatchAction";
import { useMatchSync } from "@/hooks/useMatchSync";
import {
  MatchPlayer,
  MatchResult,
  MatchToolbar,
  MatchGuide,
  MatchSpectator,
  winningCells,
} from "@/components/game/MatchPresentation";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/ToastProvider";

export default function ConnectFourClient({
  initialGame,
  currentUserId,
}: {
  initialGame: any;
  currentUserId: string;
}) {
  const { game, setGame, refresh, connectionIssue, pauseSync, resumeSync } =
    useMatchSync(initialGame, "connect-four");
  const [confirm, setConfirm] = useState(false),
    [hover, setHover] = useState<number | null>(null),
    [last, setLast] = useState<number | null>(null),
    [rematchSent, setRematchSent] = useState(false);
  const previous = useRef(initialGame.board_state),
    reduced = useReducedMotion(),
    router = useRouter(),
    { toast } = useToast();
  const me =
    game.red_player_id === currentUserId
      ? "R"
      : game.yellow_player_id === currentUserId
        ? "Y"
        : null;
  const over = ["red_won", "yellow_won", "draw"].includes(game.status),
    myTurn = Boolean(
      me === game.current_turn && me && game.status === "in_progress",
    );
  const current = game.current_turn === "R" ? game.red : game.yellow,
    winner =
      game.status === "red_won"
        ? game.red
        : game.status === "yellow_won"
          ? game.yellow
          : null;
  const status =
    game.status === "waiting"
      ? "Waiting for an opponent"
      : over
        ? game.status === "draw"
          ? "Draw"
          : `${winner?.full_name || "Player"} wins`
        : myTurn
          ? "Your turn"
          : `${current?.full_name || game.current_turn}’s turn`;
  const winning = winningCells(game.board_state, 7, 4);
  useEffect(() => {
    const index = [...game.board_state].findIndex(
      (cell: string, i: number) => cell !== "-" && previous.current[i] !== cell,
    );
    if (index >= 0) setLast(index);
    previous.current = game.board_state;
  }, [game.board_state]);
  const { action, busy } = useMatchAction({
    pauseSync,
    resumeSync,
    refresh,
    onError: toast,
  });
  function move(column: number) {
    if (!myTurn || busy) return;
    const board = game.board_state.split("");
    let target = -1;
    for (let row = 5; row >= 0; row--)
      if (board[row * 7 + column] === "-") {
        target = row * 7 + column;
        break;
      }
    if (target < 0) return;
    board[target] = me;
    setGame({
      ...game,
      board_state: board.join(""),
      current_turn: me === "R" ? "Y" : "R",
    });
    void action(() => makeConnectFourMove(game.id, column));
  }
  const ledger = game.result,
    delta = ledger
      ? ledger.player1_id === currentUserId
        ? ledger.player1_lp_delta
        : ledger.player2_lp_delta
      : null;
  return (
    <main className="match-room space-y-6">
      <MatchToolbar
        icon={<CircleDot size={22} />}
        title="Connect Four"
        status={status}
        disconnected={connectionIssue}
        finished={over}
      />
      <div className="match-stage">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MatchPlayer
              name={game.red?.full_name}
              avatar={game.red?.avatar_url}
              lp={game.red?.lounge_lp}
              side="Red"
              active={
                !over &&
                game.status === "in_progress" &&
                game.current_turn === "R"
              }
            />
            <MatchPlayer
              name={game.yellow?.full_name}
              avatar={game.yellow?.avatar_url}
              lp={game.yellow?.lounge_lp}
              side="Yellow"
              active={
                !over &&
                game.status === "in_progress" &&
                game.current_turn === "Y"
              }
            />
          </div>
          {!me && <MatchSpectator count={game.spectators?.length} />}
          <section className="match-panel p-6">
            <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: 7 }, (_, column) => (
                <button
                  key={column}
                  disabled={!myTurn || busy || game.board_state[column] !== "-"}
                  aria-label={`Drop ${me === "R" ? "red" : "yellow"} disc in column ${column + 1}`}
                  onMouseEnter={() => setHover(column)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(column)}
                  onBlur={() => setHover(null)}
                  onClick={() => move(column)}
                  className="grid min-h-11 place-items-center rounded-xl text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-25"
                >
                  <ArrowDown size={20} />
                </button>
              ))}
            </div>
            <div
              role="img"
              aria-label="Connect Four board. R is red, Y is yellow."
              className="grid grid-cols-7 gap-1.5 overflow-hidden rounded-2xl border border-primary/20 bg-primary/15 p-2 sm:gap-2 sm:p-4"
            >
              {game.board_state.split("").map((cell: string, index: number) => {
                let preview = false;
                if (
                  hover !== null &&
                  myTurn &&
                  index % 7 === hover &&
                  cell === "-"
                ) {
                  preview =
                    Math.floor(index / 7) === 5 ||
                    game.board_state[index + 7] !== "-";
                }
                return (
                  <div
                    key={index}
                    aria-label={`Row ${Math.floor(index / 7) + 1}, column ${(index % 7) + 1}: ${cell === "-" ? "empty" : cell === "R" ? "red" : "yellow"}`}
                    className={`relative aspect-square rounded-full bg-card shadow-inner ${winning.includes(index) ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-card" : last === index ? "ring-2 ring-primary" : ""}`}
                  >
                    {cell !== "-" ? (
                      <motion.span
                        key={cell}
                        initial={reduced ? false : { y: -80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className={`absolute inset-0.5 rounded-full border-2 shadow-sm ${cell === "R" ? "border-red-600 bg-gradient-to-br from-red-400 to-red-600" : "border-amber-500 bg-gradient-to-br from-yellow-200 to-amber-400"}`}
                      />
                    ) : preview ? (
                      <span
                        className={`absolute inset-1 rounded-full opacity-30 ${me === "R" ? "bg-red-500" : "bg-amber-400"}`}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p
              role="status"
              className="mt-4 text-center text-sm text-muted-foreground"
            >
              {busy
                ? "Saving…"
                : myTurn
                  ? "Choose a column above to drop your disc."
                  : status}
            </p>
          </section>
          {over && (
            <MatchResult title={status}>
              {me && delta !== null && (
                <span className="text-sm font-bold text-primary">
                  {delta >= 0 ? "+" : ""}
                  {delta} Lounge LP
                </span>
              )}
              {me && (
                <button
                  disabled={busy || rematchSent}
                  onClick={() =>
                    void action(async () => {
                      await challengeUserToConnectFour(
                        me === "R" ? game.yellow_player_id : game.red_player_id,
                      );
                      setRematchSent(true);
                      toast("Rematch invite sent.");
                    })
                  }
                  className="match-button match-button-primary"
                >
                  {rematchSent ? "Invite sent" : "Invite to rematch"}
                </button>
              )}
            </MatchResult>
          )}
          {me && game.status === "in_progress" && (
            <button
              disabled={busy}
              onClick={() => setConfirm(true)}
              className="match-button match-button-danger"
            >
              Resign match
            </button>
          )}
          {me && game.status === "waiting" && (
            <button
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await cancelConnectFourGame(game.id);
                  router.push("/office-lounge");
                })
              }
              className="match-button match-button-secondary"
            >
              Cancel invitation
            </button>
          )}
        </div>
        <MatchGuide
          objective="Connect four. Claim the board."
          tips={[
            "Choose a column to drop your disc.",
            "Connect four horizontally, vertically, or diagonally.",
            "Look for threats and block your opponent before their next move.",
          ]}
        />
      </div>
      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void action(() => resignConnectFourGame(game.id))}
        title="Resign this match?"
        message="Your opponent will win this match. Your Lounge rank will be updated."
        confirmText="Resign match"
      />
    </main>
  );
}
