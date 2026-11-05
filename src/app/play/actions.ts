"use server";

import {
  answerMissionFor,
  finishMissionFor,
  hintMissionFor,
  readMissionQuestions,
  resetDevelopmentMission,
  startMissionFor,
} from "@/features/missions/composition";
import { getCurrentUser } from "@/features/identity/public-server";
import { revalidatePath } from "next/cache";

export async function startDailySession() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const result = await startMissionFor(user);
  revalidatePath("/play");
  return result;
}

export async function fetchSessionQuestions(sessionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return readMissionQuestions(sessionId, user.id);
}

export async function submitAnswer(
  sessionQuestionId: string,
  answer: string,
  timeSpentSeconds: number,
  options?: {
    customIsCorrect?: boolean;
    wasHintUsed?: boolean;
    isPerfect?: boolean;
    currentCombo?: number;
    isSkipped?: boolean;
    customScoreModifiers?: {
      mistakes?: number;
      customSpeedBonus?: number;
      accuracy?: number;
      baseScore?: number;
    };
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return answerMissionFor(
    user.id,
    sessionQuestionId,
    answer,
    timeSpentSeconds,
    Boolean(options?.isSkipped),
  );
}

export async function endSession(
  sessionId: string,
  requested: "completed" | "expired" = "completed",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const result = await finishMissionFor(sessionId, user.id, requested);
  revalidatePath("/dashboard");
  revalidatePath("/daily-mission");
  return result;
}

export async function useMissionHint(sessionQuestionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return hintMissionFor(sessionQuestionId, user.id);
}

export async function resetDailySession() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Test resets are disabled in production");
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  await resetDevelopmentMission(user);

  revalidatePath("/dashboard");
  revalidatePath("/play");
  return { success: true };
}
