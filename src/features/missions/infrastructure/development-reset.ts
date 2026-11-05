import "server-only";
import { withTransaction } from "@/server/database/connection";
import { missionDate } from "../domain/session";

export async function resetDevelopmentMission(user: { id: string }) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Test resets are disabled in production");
  return withTransaction(async (client) => {
    const { rows: profiles } = await client.query<{ timezone: string }>(
      "SELECT timezone FROM profiles WHERE id=$1 FOR UPDATE",
      [user.id],
    );
    const today = missionDate(profiles[0]?.timezone);
    const { rows: sessions } = await client.query<{
      is_completed: boolean;
      total_xp_earned: number;
    }>(
      "SELECT is_completed,total_xp_earned FROM daily_sessions WHERE user_id=$1 AND date=$2 FOR UPDATE",
      [user.id, today],
    );
    const session = sessions[0];
    if (session?.is_completed)
      await client.query(
        "UPDATE profiles SET total_xp=GREATEST(0,total_xp-$2),games_played=GREATEST(0,games_played-1),current_streak=GREATEST(0,current_streak-1) WHERE id=$1",
        [user.id, session.total_xp_earned || 0],
      );
    await client.query(
      "DELETE FROM daily_sessions WHERE user_id=$1 AND date=$2",
      [user.id, today],
    );
  });
}
