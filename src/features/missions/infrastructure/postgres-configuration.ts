import "server-only";
import { withTransaction } from "../../../server/database/connection";
import type { MissionConfigurationRepository } from "../application/configuration";

export const postgresConfiguration: MissionConfigurationRepository = {
  locked: (work) =>
    withTransaction(async (client) => {
      const { rows } = await client.query<{ daily_game_count: number }>(
        "SELECT daily_game_count FROM system_settings WHERE id=1 FOR UPDATE",
      );
      if (!rows[0])
        throw new Error("Daily Mission settings are not configured.");
      return work({
        activeCount: async () =>
          (
            await client.query<{ count: number }>(
              "SELECT count(*)::int AS count FROM game_types WHERE is_active=true",
            )
          ).rows[0].count,
        missionSize: async () => rows[0].daily_game_count,
        setMissionSize: async (count) => {
          await client.query(
            "UPDATE system_settings SET daily_game_count=$1, daily_mission_game_ids=NULL, updated_at=now() WHERE id=1",
            [count],
          );
        },
        setGameStatus: async (id, expected, next) =>
          (
            await client.query(
              "UPDATE game_types SET is_active=$1 WHERE id=$2 AND is_active=$3",
              [next, id, expected],
            )
          ).rowCount === 1,
        setRounds: async (id, easy, medium, hard) =>
          (
            await client.query(
              "UPDATE game_types SET easy_rounds=$1, medium_rounds=$2, hard_rounds=$3 WHERE id=$4",
              [easy, medium, hard, id],
            )
          ).rowCount === 1,
      });
    }),
};
