export interface ChessPosition {
  turn(): "w" | "b";
  history(): string[];
  fen(): string;
  isCheckmate(): boolean;
  isDraw(): boolean;
}
export interface ChessRules {
  load(pgn: string): ChessPosition;
}
export interface ChessMatch {
  status: string;
  pgn: string;
  fen: string;
  white_player_id: string;
  black_player_id: string;
  white_time_ms: number;
  black_time_ms: number;
  last_move_timestamp: string | null;
}

export function evaluateChessTurn(
  rules: ChessRules,
  game: ChessMatch,
  userId: string,
  move: { pgn: string; fen: string; turn: "w" | "b" },
  now: number,
) {
  if (game.status !== "in_progress") throw new Error("Match is not active");
  const current = rules.load(game.pgn || ""),
    submitted = rules.load(move.pgn);
  if (
    (current.turn() === "w" ? game.white_player_id : game.black_player_id) !==
    userId
  )
    throw new Error("Not your turn");
  const previous = current.history(),
    incoming = submitted.history();
  if (
    incoming.length !== previous.length + 1 ||
    previous.some((value, index) => incoming[index] !== value) ||
    submitted.fen() !== move.fen ||
    submitted.turn() !== move.turn
  )
    throw new Error("Illegal move");
  const column = current.turn() === "w" ? "white_time_ms" : "black_time_ms";
  const remaining = Math.max(
    0,
    Number(game[column]) -
      Math.max(0, now - new Date(game.last_move_timestamp || now).getTime()),
  );
  const timedOut = remaining === 0;
  const status = timedOut
    ? current.turn() === "w"
      ? "black_won"
      : "white_won"
    : submitted.isCheckmate()
      ? move.turn === "w"
        ? "black_won"
        : "white_won"
      : submitted.isDraw()
        ? "draw"
        : "in_progress";
  return {
    column,
    remaining,
    reason: timedOut
      ? "timeout"
      : submitted.isCheckmate()
        ? "checkmate"
        : "draw",
    payload: {
      pgn: timedOut ? game.pgn : move.pgn,
      fen: timedOut ? game.fen : move.fen,
      turn: timedOut ? current.turn() : move.turn,
      status,
      white_time_ms:
        column === "white_time_ms" ? remaining : game.white_time_ms,
      black_time_ms:
        column === "black_time_ms" ? remaining : game.black_time_ms,
      last_move_timestamp: new Date(now).toISOString(),
    },
  };
}
