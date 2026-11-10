import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";
import { GAME_REGISTRY } from "../domain/game-registry";

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

export function selectProfilesForGET<T extends QueryResultRow = QueryResultRow>(
  values: unknown[] = [],
  executor: SqlExecutor = database,
) {
  const sources = Object.values(GAME_REGISTRY).map(
    ({ table, type, playerColumns: [first, second] }) =>
      `SELECT g.id,'${type}' AS type,g.created_at,p.full_name AS challenger FROM ${table} g JOIN profiles p ON p.id=g.${first} AND p.is_active=true WHERE g.${second}=$1 AND g.status='waiting' AND g.created_at>now()-interval '30 minutes'`,
  );
  return executor.query<T>(
    sources.join(" UNION ALL ") + " ORDER BY created_at DESC",
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
