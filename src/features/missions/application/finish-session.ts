import { missionDeadline, type DailyMissionSession } from "../domain/session";
import { calculateMissionSettlement } from "../domain/settlement";

export interface SettlementWriter {
  session: DailyMissionSession;
  questions: { is_completed: boolean; earned_xp: number }[];
  recordTime(seconds: number): Promise<void>;
  expire(score: number): Promise<void>;
  profile(): Promise<{
    total_xp: number;
    current_streak: number;
    current_level: number;
  }>;
  previousDate(): Promise<string | Date | undefined>;
  complete(
    score: number,
    result: ReturnType<typeof calculateMissionSettlement>,
  ): Promise<void>;
  activity(type: string, metadata: Record<string, unknown>): Promise<void>;
}
export interface SettlementRepository {
  locked<T>(
    sessionId: string,
    userId: string,
    work: (writer: SettlementWriter) => Promise<T>,
  ): Promise<T>;
}

export function createMissionFinisher(
  repository: SettlementRepository,
  now: () => number = Date.now,
) {
  return (
    sessionId: string,
    userId: string,
    requested: "completed" | "expired" = "completed",
  ) =>
    repository.locked(sessionId, userId, async (writer) => {
      const { session, questions } = writer;
      if (session.status !== "in_progress")
        return {
          success: true,
          outcome: session.status,
          totalXp: session.total_xp_earned,
        };
      const all =
        questions.length > 0 && questions.every((q) => q.is_completed);
      if (requested === "completed" && !all)
        return {
          error: "Finish every challenge before completing the mission",
        };
      if (requested === "expired" && now() < missionDeadline(session) && !all)
        return { error: "Mission time has not expired" };
      const score = questions.reduce(
        (sum, q) => sum + Number(q.earned_xp || 0),
        0,
      );
      await writer.recordTime(
        Math.max(
          0,
          Math.min(
            Number(session.allowed_duration_seconds),
            Math.floor((now() - new Date(session.created_at).getTime()) / 1000),
          ),
        ),
      );
      if (!all) {
        await writer.expire(score);
        return { success: true, outcome: "expired" };
      }
      const profile = await writer.profile();
      const result = calculateMissionSettlement({
        date: session.date,
        previousDate: await writer.previousDate(),
        score,
        currentStreak: profile.current_streak,
        totalXp: profile.total_xp,
      });
      await writer.complete(score, result);
      await writer.activity("mission", {
        description: `completed a Daily Mission with a score of ${score} and earned ${result.earnedXp} XP`,
        session_id: sessionId,
        score,
        xp: result.earnedXp,
        streak: result.streak,
      });
      if (result.level > profile.current_level)
        await writer.activity("achievement", {
          description: `reached Level ${result.level}`,
          level: result.level,
        });
      return { success: true, outcome: "completed", totalXp: result.earnedXp };
    });
}
