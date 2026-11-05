import { Chess } from "chess.js";
import "server-only";
import type { ChessRules } from "../application/chess-turn";

export const chessRules: ChessRules = {
  load(pgn) {
    const board = new Chess();
    if (pgn) board.loadPgn(pgn);
    return board;
  },
};
