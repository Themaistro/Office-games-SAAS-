import { calendarDate } from "./session";

export function calculateMissionSettlement(input: {
  date: string | Date;
  previousDate?: string | Date;
  score: number;
  currentStreak: number;
  totalXp: number;
}) {
  const gap = input.previousDate
    ? Math.round(
        (Date.parse(calendarDate(input.date)) -
          Date.parse(calendarDate(input.previousDate))) /
          86_400_000,
      )
    : null;
  const streak =
    gap === 0 ? input.currentStreak : gap === 1 ? input.currentStreak + 1 : 1;
  const bonus = gap !== 0 && streak > 1 ? streak * 50 : 0;
  const earnedXp = input.score + bonus,
    totalXp = Math.max(0, input.totalXp + earnedXp);
  return { streak, earnedXp, totalXp, level: Math.floor(totalXp / 1200) + 1 };
}
