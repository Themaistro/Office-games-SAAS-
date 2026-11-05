export type MissionActor = { id: string; email: string };
export type MissionProfile = {
  department: string | null;
  timezone: string | null;
  daily_time_limit_minutes: number | null;
  session_time_limit_minutes: number | null;
};
export type MissionSettings = {
  daily_game_count: number;
  cooldown_hours: number;
  daily_time_limit_minutes: number;
};
export type DailyMissionSession = {
  id: string;
  user_id: string;
  date: string | Date;
  status: string;
  created_at: string;
  allowed_duration_seconds: number;
  is_completed: boolean;
  total_xp_earned?: number;
};
export type MissionStartResult =
  | {
      success: true;
      session: DailyMissionSession;
      error?: undefined;
      message?: undefined;
    }
  | {
      error: string;
      message?: string;
      session?: DailyMissionSession;
      success?: undefined;
    };

export function missionDate(timezone?: string | null, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return missionDate("UTC", date);
  }
}

export function missionDeadline(
  session: Pick<DailyMissionSession, "created_at" | "allowed_duration_seconds">,
) {
  return (
    new Date(session.created_at).getTime() +
    Number(session.allowed_duration_seconds) * 1000
  );
}

export function calendarDate(value: string | Date) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}
