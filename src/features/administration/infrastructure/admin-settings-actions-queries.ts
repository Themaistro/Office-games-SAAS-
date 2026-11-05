import { query } from "@/server/database/connection";
import type { SqlExecutor } from "@/server/database/executor";
import type { QueryResultRow } from "pg";
import "server-only";

const database: SqlExecutor = { query };

export function selectSystemSettingsForResetSeason<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT current_season FROM system_settings WHERE id=1 FOR UPDATE",
    values,
  );
}

export function selectProfilesForResetSeason<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "SELECT id,total_xp FROM profiles WHERE role='employee' AND is_active=true ORDER BY total_xp DESC,full_name ASC LIMIT 3",
    values,
  );
}

export function insertSeasonWinnersForResetSeason<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO season_winners(season_number,user_id,rank,total_xp) VALUES($1,$2,$3,$4)",
    values,
  );
}

export function insertSeasonSnapshotsForResetSeason<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "INSERT INTO season_snapshots(season_number,user_id,total_xp,lounge_lp) SELECT $1,id,total_xp,lounge_lp FROM profiles WHERE role='employee' ON CONFLICT DO NOTHING",
    values,
  );
}

export function updateSystemSettingsForResetSeason<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE system_settings SET current_season=$1,season_start_date=now(),updated_at=now() WHERE id=1",
    values,
  );
}

export function selectSystemSettingsForGetSystemSettings<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>("SELECT * FROM system_settings WHERE id=1", values);
}

export function updateSystemSettingsForUpdateSystemSettings<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `UPDATE system_settings SET cooldown_hours=$1,
      daily_time_limit_minutes=$2, updated_at=now() WHERE id=1`,
    values,
  );
}

export function updateDailySessionsForUpdateSystemSettings<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    `UPDATE daily_sessions SET allowed_duration_seconds=$1
      WHERE created_at>=CURRENT_DATE AND user_id IN
      (SELECT id FROM profiles WHERE session_time_limit_minutes IS NULL)`,
    values,
  );
}

export function updateProfilesForFactoryResetPlatform<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET total_xp=0,current_streak=0,best_streak=0,current_level=1,games_played=0,lounge_lp=0 WHERE role='employee'",
    values,
  );
}

export function updateSystemSettingsForFactoryResetPlatform<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE system_settings SET current_season=1,season_start_date=now(),updated_at=now() WHERE id=1",
    values,
  );
}

export function updateProfilesForBulkUpdateTimeLimits<
  T extends QueryResultRow = QueryResultRow,
>(values: unknown[] = [], executor: SqlExecutor = database) {
  return executor.query<T>(
    "UPDATE profiles SET daily_time_limit_minutes=$1,session_time_limit_minutes=$2 WHERE role='employee'",
    values,
  );
}
