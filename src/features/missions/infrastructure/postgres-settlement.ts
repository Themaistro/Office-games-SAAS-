import "server-only";
import { withTransaction } from "../../../server/database/connection";
import type { SettlementRepository } from "../application/finish-session";
import type { DailyMissionSession } from "../domain/session";

export const postgresSettlement: SettlementRepository = {
  locked: (id, userId, work) =>
    withTransaction(async (client) => {
      const session = (
        await client.query<DailyMissionSession>(
          "SELECT * FROM daily_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",
          [id, userId],
        )
      ).rows[0];
      if (!session) throw new Error("Session not found");
      const questions = (
        await client.query<{ is_completed: boolean; earned_xp: number }>(
          "SELECT is_completed,earned_xp FROM session_questions WHERE session_id=$1",
          [id],
        )
      ).rows;
      return work({
        session,
        questions,
        recordTime: async (seconds) => {
          await client.query(
            "UPDATE daily_sessions SET time_spent_seconds=$1 WHERE id=$2",
            [seconds, id],
          );
        },
        expire: async (score) => {
          await client.query(
            "UPDATE daily_sessions SET status='expired',is_completed=false,total_score=$1,total_xp_earned=0,ended_at=now() WHERE id=$2",
            [score, id],
          );
        },
        async profile() {
          const profile = (
            await client.query<{
              total_xp: number;
              current_streak: number;
              current_level: number;
            }>(
              "SELECT total_xp,current_streak,current_level FROM profiles WHERE id=$1 FOR UPDATE",
              [userId],
            )
          ).rows[0];
          if (!profile) throw new Error("Profile not found");
          return profile;
        },
        previousDate: async () =>
          (
            await client.query<{ date: string | Date }>(
              "SELECT date FROM daily_sessions WHERE user_id=$1 AND status='completed' AND id<>$2 ORDER BY date DESC,created_at DESC LIMIT 1",
              [userId, id],
            )
          ).rows[0]?.date,
        async complete(score, result) {
          await client.query(
            "UPDATE daily_sessions SET status='completed',is_completed=true,total_score=$1,total_xp_earned=$2,ended_at=now() WHERE id=$3",
            [score, result.earnedXp, id],
          );
          await client.query(
            "UPDATE profiles SET total_xp=$1,current_level=$2,current_streak=$3,best_streak=GREATEST(best_streak,$3),games_played=games_played+1,last_played_at=now() WHERE id=$4",
            [result.totalXp, result.level, result.streak, userId],
          );
        },
        activity: async (type, metadata) => {
          await client.query(
            "INSERT INTO activity_feed(user_id,activity_type,metadata) VALUES($1,$2,$3::jsonb)",
            [userId, type, JSON.stringify(metadata)],
          );
        },
      });
    }),
};
