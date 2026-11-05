import "server-only";
import { query } from "../../../server/database/connection";
import type { LineupRepository } from "../application/daily-lineup";

export const postgresLineups: LineupRepository = {
  async find(userId, date) {
    const { rows } = await query<{ game_ids: string[] }>(
      "SELECT game_ids FROM user_daily_mission_lineups WHERE user_id=$1 AND mission_date=$2",
      [userId, date],
    );
    return rows[0]?.game_ids ?? null;
  },
  async history(userId, date) {
    const { rows } = await query<{ game_ids: string[] }>(
      "SELECT game_ids FROM user_daily_mission_lineups WHERE user_id=$1 AND mission_date<$2 ORDER BY mission_date DESC LIMIT 60",
      [userId, date],
    );
    return rows.map((row) => row.game_ids);
  },
  async save(userId, date, ids, seed) {
    await query(
      `INSERT INTO user_daily_mission_lineups (user_id, mission_date, game_ids, seed)
      VALUES ($1,$2,$3::uuid[],$4) ON CONFLICT (user_id,mission_date)
      DO UPDATE SET game_ids=EXCLUDED.game_ids, seed=EXCLUDED.seed`,
      [userId, date, ids, seed],
    );
  },
};
