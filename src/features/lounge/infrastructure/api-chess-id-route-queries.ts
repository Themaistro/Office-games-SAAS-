import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectChessGamesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT * FROM chess_games WHERE id = $1", values);
}

export function insertGameSpectatorsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO game_spectators (game_type, game_id, user_id) VALUES ('chess', $1, $2) ON CONFLICT (game_type, game_id, user_id) DO UPDATE SET last_seen=now()",
    values,
  );
}

export function selectGameSpectatorsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT p.id, p.full_name, p.avatar_url FROM game_spectators s JOIN profiles p ON p.id=s.user_id WHERE s.game_type='chess' AND s.game_id=$1 AND s.last_seen > now() - interval '10 seconds' ORDER BY s.last_seen DESC",
    values,
  );
}

export function selectChessEventsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT e.id, e.sender_id, e.event_type, e.payload, e.created_at, p.full_name FROM chess_events e JOIN profiles p ON p.id=e.sender_id WHERE e.game_id=$1 AND e.created_at > COALESCE($2::timestamptz, now() - interval '2 minutes') ORDER BY e.created_at ASC LIMIT 50",
    values,
  );
}

export function selectPresenceForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    "SELECT user_id FROM presence WHERE user_id=ANY($1::uuid[]) AND last_seen>now()-interval '90 seconds'",
    values,
  );
}

export function selectChessGamesForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT white_player_id, black_player_id FROM chess_games WHERE id=$1 AND status='in_progress'",
    values,
  );
}

export function updateChessGamesForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE chess_games SET draw_offered_by=$1 WHERE id=$2 AND status='in_progress' AND (draw_offered_by IS NULL OR draw_offered_by=$1)",
    values,
  );
}

export function updateChessGamesForPOST2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE chess_games SET draw_offered_by=NULL WHERE id=$1 AND status='in_progress'",
    values,
  );
}

export function insertChessEventsForPOST<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO chess_events (game_id, sender_id, event_type, payload) VALUES ($1,$2,$3,$4::jsonb) RETURNING id, sender_id, event_type, payload, created_at",
    values,
  );
}
