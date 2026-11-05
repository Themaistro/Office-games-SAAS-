import "server-only";
import { query } from "../../../server/database/connection";
import { GAME_REGISTRY } from "../../lounge/domain/game-registry";
import type { MissionStartRepository } from "../application/start-session";
import type { MissionGame } from "../domain/rotation";
import type {
  DailyMissionSession,
  MissionProfile,
  MissionSettings,
} from "../domain/session";
import { assembleMissionContent } from "./postgres-content-pool";

export const postgresMissionStart: MissionStartRepository = {
  profile: async (id) =>
    (
      await query<MissionProfile>(
        "SELECT department,timezone,daily_time_limit_minutes,session_time_limit_minutes FROM profiles WHERE id=$1",
        [id],
      )
    ).rows[0] ?? null,
  secondsPlayed: async (id, date) =>
    Number(
      (
        await query(
          "SELECT COALESCE(sum(time_spent_seconds),0) AS seconds FROM daily_sessions WHERE user_id=$1 AND created_at >= $2::timestamptz",
          [id, `${date}T00:00:00Z`],
        )
      ).rows[0].seconds,
    ),
  async activeLounge(id) {
    if (
      (
        await query(
          "SELECT 1 FROM lounge_rooms r JOIN lounge_room_players p ON p.room_id=r.id WHERE p.user_id=$1 AND p.state='joined' AND r.status='in_progress' AND r.updated_at>now()-interval '2 hours' LIMIT 1",
          [id],
        )
      ).rowCount
    )
      return "Lounge party";
    for (const game of Object.values(GAME_REGISTRY)) {
      const [first, second] = game.playerColumns;
      if (
        (
          await query(
            `SELECT 1 FROM ${game.table} WHERE status='in_progress' AND ($1=${first} OR $1=${second}) LIMIT 1`,
            [id],
          )
        ).rowCount
      )
        return `${game.label} match`;
    }
    return null;
  },
  active: async (id) =>
    (
      await query<DailyMissionSession>(
        "SELECT * FROM daily_sessions WHERE user_id=$1 AND status='in_progress' ORDER BY created_at DESC LIMIT 1",
        [id],
      )
    ).rows[0] ?? null,
  questionCount: async (id) =>
    (
      await query<{ count: number }>(
        "SELECT count(*)::int AS count FROM session_questions WHERE session_id=$1",
        [id],
      )
    ).rows[0].count,
  removeBroken: async (id, user) => {
    await query("DELETE FROM daily_sessions WHERE id=$1 AND user_id=$2", [
      id,
      user,
    ]);
  },
  expiredToday: async (user, date) =>
    Boolean(
      (
        await query(
          "SELECT 1 FROM daily_sessions WHERE user_id=$1 AND date=$2 AND status='expired' LIMIT 1",
          [user, date],
        )
      ).rowCount,
    ),
  latest: async (id) =>
    (
      await query<DailyMissionSession>(
        "SELECT * FROM daily_sessions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
        [id],
      )
    ).rows[0] ?? null,
  settings: async () =>
    (
      await query<MissionSettings>(
        "SELECT daily_game_count,cooldown_hours,daily_time_limit_minutes FROM system_settings WHERE id=1",
      )
    ).rows[0] ?? {
      daily_game_count: 5,
      cooldown_hours: 24,
      daily_time_limit_minutes: 15,
    },
  games: async () =>
    (
      await query<MissionGame>(
        "SELECT id,name,slug FROM game_types WHERE is_active=true",
      )
    ).rows,
  assemble: assembleMissionContent,
};
