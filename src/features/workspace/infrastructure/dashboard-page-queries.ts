import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectProfilesForDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM profiles WHERE id = $1 LIMIT 1",
    values,
  );
}

export function selectAnnouncementsForDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT * FROM announcements WHERE is_active = true ORDER BY created_at DESC",
    values,
  );
}

export function selectSystemSettingsForDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT daily_game_count, daily_time_limit_minutes, daily_mission_game_ids FROM system_settings WHERE id = 1",
    values,
  );
}

export function selectUserDailyMissionLineupsForDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT game_ids FROM user_daily_mission_lineups WHERE mission_date = $1 AND user_id=$2 LIMIT 1",
    values,
  );
}

export function selectGameTypesForDashboardPage<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id, name, slug FROM game_types WHERE is_active = true ORDER BY name",
    values,
  );
}
