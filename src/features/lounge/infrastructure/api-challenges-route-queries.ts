import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectChessGamesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT id, 'chess' AS type, status, created_at, updated_at, CASE WHEN white_player_id=$1 THEN black_player_id ELSE white_player_id END AS other_player_id FROM chess_games WHERE white_player_id=$1 OR black_player_id=$1 UNION ALL SELECT id, 'ttt' AS type, status, created_at, updated_at, CASE WHEN x_player_id=$1 THEN o_player_id ELSE x_player_id END AS other_player_id FROM ttt_games WHERE x_player_id=$1 OR o_player_id=$1 UNION ALL SELECT id, 'connect-four' AS type, status, created_at, updated_at, CASE WHEN red_player_id=$1 THEN yellow_player_id ELSE red_player_id END AS other_player_id FROM connect_four_games WHERE red_player_id=$1 OR yellow_player_id=$1 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 100`,
    values,
  );
}

export function selectChallengeEventsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `SELECT game_id AS id, game_type AS type, event_type AS status, created_at, created_at AS updated_at, CASE WHEN challenger_id=$1 THEN challenged_id ELSE challenger_id END AS other_player_id FROM challenge_events WHERE challenger_id=$1 OR challenged_id=$1 ORDER BY created_at DESC LIMIT 100`,
    values,
  );
}

export function selectChessGamesForGET2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id, white_player_id, black_player_id FROM chess_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'",
    values,
  );
}

export function selectTttGamesForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    "SELECT id, x_player_id, o_player_id FROM ttt_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'",
    values,
  );
}

export function selectConnectFourGamesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id, red_player_id, yellow_player_id FROM connect_four_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'",
    values,
  );
}

export function insertChallengeEventsForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO challenge_events (game_id,game_type,challenger_id,challenged_id,event_type) VALUES ($1,'chess',$2,$3,'expired')",
    values,
  );
}

export function insertChallengeEventsForGET2<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO challenge_events (game_id,game_type,challenger_id,challenged_id,event_type) VALUES ($1,'ttt',$2,$3,'expired')",
    values,
  );
}

export function insertChallengeEventsForGET3<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO challenge_events (game_id,game_type,challenger_id,challenged_id,event_type) VALUES ($1,'connect-four',$2,$3,'expired')",
    values,
  );
}

export function deleteChessGamesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "DELETE FROM chess_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'",
    values,
  );
}

export function deleteTttGamesForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    "DELETE FROM ttt_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'",
    values,
  );
}

export function deleteConnectFourGamesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "DELETE FROM connect_four_games WHERE status='waiting' AND created_at < now() - interval '30 minutes'",
    values,
  );
}

export function selectProfilesForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  return executor.query<T>(
    `SELECT id, 'chess' AS type, created_at, (SELECT full_name FROM profiles WHERE id=white_player_id) AS challenger FROM chess_games WHERE black_player_id=$1 AND white_player_id IS NOT NULL AND status='waiting' UNION ALL SELECT id, 'ttt' AS type, created_at, (SELECT full_name FROM profiles WHERE id=x_player_id) AS challenger FROM ttt_games WHERE o_player_id=$1 AND x_player_id IS NOT NULL AND status='waiting' UNION ALL SELECT id, 'connect-four' AS type, created_at, (SELECT full_name FROM profiles WHERE id=red_player_id) AS challenger FROM connect_four_games WHERE yellow_player_id=$1 AND red_player_id IS NOT NULL AND status='waiting' ORDER BY created_at DESC`,
    values,
  );
}

export function selectLoungeRoomInvitesForGET<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT r.id,'party' AS type,i.created_at,p.full_name AS challenger,(CASE WHEN r.format='trivia' THEN 'Trivia' ELSE 'Mixed Challenges' END)||' '||(CASE WHEN r.mode='duel' THEN 'Duel' ELSE 'Group' END) AS label FROM lounge_room_invites i JOIN lounge_rooms r ON r.id=i.room_id JOIN profiles p ON p.id=i.sender_id WHERE i.recipient_id=$1 AND i.status='pending' AND i.expires_at>now() AND r.status='waiting' AND r.created_at>now()-interval '30 minutes'",
    values,
  );
}

export function updateLoungeRoomInvitesForDELETE<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE lounge_room_invites SET status='declined' WHERE room_id=$1 AND recipient_id=$2 AND status='pending'",
    values,
  );
}

export function insertChallengeEventsForDELETE<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO challenge_events (game_id,game_type,actor_id,challenger_id,challenged_id,event_type) VALUES ($1,$2,$3,$4,$5,'declined')",
    values,
  );
}
