"use client";
import { matchResultDescription } from "@/features/lounge/domain/match-result";
import RematchControls from "@/components/game/RematchControls";

import { useState } from "react";
import { Circle, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { makeTttMove, resignTttGame, cancelTttGame } from "../actions";
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

export default function TttBoardClient({
  initialGame,
  currentUserId,
}: {
  initialGame: any;
  currentUserId: string;
  matchupScore: { xWins: number; oWins: number; draws: number };
}) {
  const { game, setGame, refresh, connectionIssue, pauseSync, resumeSync } =
    useMatchSync(initialGame, "ttt");
  const [confirm, setConfirm] = useState(false);
  const reduced = useReducedMotion(),
    router = useRouter(),
    { toast } = useToast();
  const me =
    game.x_player_id === currentUserId
      ? "X"
      : game.o_player_id === currentUserId
        ? "O"
        : null;
  const over = ["x_won", "o_won", "draw"].includes(game.status);
  const turn = game.current_turn === "X" ? game.x_player : game.o_player;
  const myTurn = Boolean(
    me && me === game.current_turn && game.status === "in_progress",
  );
  const winner =
    game.status === "x_won"
      ? game.x_player
      : game.status === "o_won"
        ? game.o_player
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
          : `${turn?.full_name || game.current_turn}’s turn`;
  const winning = winningCells(game.board_state, 3, 3);
  const { action, busy } = useMatchAction({
    pauseSync,
    resumeSync,
    refresh,
    onError: toast,
  });
  function move(index: number) {
    if (!myTurn || busy || game.board_state[index] !== "-") return;
    const board = game.board_state.split("");
    board[index] = me;
    setGame({
      ...game,
      board_state: board.join(""),
      current_turn: me === "X" ? "O" : "X",
    });
    void action(() => makeTttMove(game.id, index));
  }
  const ledger = game.result;
  const delta = ledger
    ? ledger.player1_id === currentUserId
      ? ledger.player1_lp_delta
      : ledger.player2_lp_delta
    : null;
  return (
    <main className="match-room space-y-6">
      <MatchToolbar
        icon={<X size={22} />}
        title="Tic-Tac-Toe"
        status={status}
        disconnected={connectionIssue}
        finished={over}
      />
      <div className="match-stage">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MatchPlayer
              name={game.x_player?.full_name}
              avatar={game.x_player?.avatar_url}
              lp={game.x_player?.lounge_lp}
              side="X"
              active={
                !over &&
                game.status === "in_progress" &&
                game.current_turn === "X"
              }
            />
            <MatchPlayer
              name={game.o_player?.full_name}
              avatar={game.o_player?.avatar_url}
              lp={game.o_player?.lounge_lp}
              side="O"
              active={
                !over &&
                game.status === "in_progress" &&
                game.current_turn === "O"
              }
            />
          </div>
          {!me && <MatchSpectator count={game.spectators?.length} />}
          <section aria-label="Tic-Tac-Toe board" className="match-panel p-6">
            <div className="mx-auto grid aspect-square w-full max-w-[400px] grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-2">
              {game.board_state.split("").map((cell: string, index: number) => (
                <button
                  key={index}
                  aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}: ${cell === "-" ? "empty" : cell}`}
                  onClick={() => move(index)}
                  disabled={!myTurn || busy || cell !== "-"}
                  className={`grid aspect-square place-items-center rounded-xl border bg-card transition-colors focus-visible:outline-2 focus-visible:outline-primary ${winning.includes(index) ? "border-emerald-500 bg-emerald-50" : "border-border enabled:hover:border-primary enabled:hover:bg-primary/5"}`}
                >
                  {cell !== "-" && (
                    <motion.span
                      initial={reduced ? false : { scale: 0.65, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={
                        cell === "X" ? "text-primary" : "text-rose-500"
                      }
                    >
                      {cell === "X" ? (
                        <X
                          className="h-12 w-12 sm:h-20 sm:w-20"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Circle
                          className="h-11 w-11 sm:h-16 sm:w-16"
                          strokeWidth={2.5}
                        />
                      )}
                    </motion.span>
                  )}
                </button>
              ))}
            </div>
            <p
              role="status"
              className="mt-4 text-center text-sm text-muted-foreground"
            >
              {busy ? "Saving…" : status}
            </p>
          </section>
          {over && (
            <MatchResult
              title={status}
              description={matchResultDescription(ledger?.reason)}
            >
              {me && delta !== null && (
                <span className="text-sm font-bold text-primary">
                  {delta >= 0 ? "+" : ""}
                  {delta} Lounge LP
                </span>
              )}
              {me && <RematchControls type="ttt" sourceId={game.id} />}
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
                  await cancelTttGame(game.id);
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
          objective="Three in a row wins."
          tips={[
            "Take turns placing your mark in an empty square.",
            "Make a horizontal, vertical, or diagonal line of three.",
            "A full board with no line is a draw.",
          ]}
        />
      </div>
      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void action(() => resignTttGame(game.id))}
        title="Resign this match?"
        message="Your opponent will win this match. Your Lounge rank will be updated."
        confirmText="Resign match"
      />
    </main>
  );
}
