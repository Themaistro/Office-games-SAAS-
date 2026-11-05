import "server-only";
import { query } from "../../../server/database/connection";
import type { SqlExecutor } from "../../../server/database/executor";

function clockColumn(column: string) {
  if (column !== "white_time_ms" && column !== "black_time_ms")
    throw new Error("Invalid chess clock");
  return column;
}
export function saveChessMove(
  column: string,
  values: unknown[],
  executor: SqlExecutor = { query },
) {
  return executor.query(
    `UPDATE chess_games SET pgn=$1,fen=$2,turn=$3,${clockColumn(column)}=$4,last_move_timestamp=now(),updated_at=now(),draw_offered_by=NULL WHERE id=$5`,
    values,
  );
}
export function expireChessClock(
  column: string,
  id: string,
  executor: SqlExecutor = { query },
) {
  return executor.query(
    `UPDATE chess_games SET ${clockColumn(column)}=0 WHERE id=$1`,
    [id],
  );
}
