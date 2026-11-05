import type { MissionGame } from "../domain/rotation";
import {
  missionDate,
  missionDeadline,
  type DailyMissionSession,
  type MissionActor,
  type MissionProfile,
  type MissionSettings,
  type MissionStartResult,
} from "../domain/session";

export interface MissionStartRepository {
  profile(userId: string): Promise<MissionProfile | null>;
  secondsPlayed(userId: string, date: string): Promise<number>;
  activeLounge(userId: string): Promise<string | null>;
  active(userId: string): Promise<DailyMissionSession | null>;
  questionCount(sessionId: string): Promise<number>;
  removeBroken(sessionId: string, userId: string): Promise<void>;
  expiredToday(userId: string, date: string): Promise<boolean>;
  latest(userId: string): Promise<DailyMissionSession | null>;
  settings(): Promise<MissionSettings>;
  games(): Promise<MissionGame[]>;
  assemble(input: {
    user: MissionActor;
    profile: MissionProfile | null;
    today: string;
    settings: MissionSettings;
    games: MissionGame[];
  }): Promise<MissionStartResult>;
}
export interface MissionStartDependencies {
  repository: MissionStartRepository;
  lock<T>(key: string, work: () => Promise<T>): Promise<T>;
  expire(sessionId: string, user: MissionActor): Promise<unknown>;
  now(): number;
}

export function createMissionStarter({
  repository: repo,
  lock,
  expire,
  now,
}: MissionStartDependencies) {
  async function prepare(user: MissionActor): Promise<MissionStartResult> {
    const profile = await repo.profile(user.id);
    const today = missionDate(profile?.timezone, new Date(now()));
    if (
      profile?.daily_time_limit_minutes &&
      Math.floor((await repo.secondsPlayed(user.id, today)) / 60) >=
        profile.daily_time_limit_minutes
    ) {
      return {
        error: "daily_limit_reached",
        message: `You have reached your daily limit of ${profile.daily_time_limit_minutes} minutes. Come back tomorrow!`,
      };
    }
    const lounge = await repo.activeLounge(user.id);
    if (lounge)
      return {
        error: "active_lounge_game",
        message: `Finish or leave your ${lounge} before starting a Daily Mission.`,
      };
    const active = await repo.active(user.id);
    if (active) {
      if (now() >= missionDeadline(active)) {
        await expire(active.id, user);
        return prepare(user);
      }
      if ((await repo.questionCount(active.id)) > 0)
        return { success: true, session: active };
      await repo.removeBroken(active.id, user.id);
    }
    if (await repo.expiredToday(user.id, today))
      return {
        error: "mission_expired",
        message:
          "Today's mission time has ended. Your next mission will be available tomorrow.",
      };
    const latest = await repo.latest(user.id),
      settings = await repo.settings();
    if (
      latest?.is_completed &&
      settings.cooldown_hours > 0 &&
      now() - new Date(latest.created_at).getTime() <
        settings.cooldown_hours * 3_600_000
    ) {
      return {
        error: "24_hour_cooldown",
        message: `You must wait ${settings.cooldown_hours} hours between challenges.`,
        session: latest,
      };
    }
    const games = await repo.games();
    if (!games.length)
      return {
        error: "No active games available right now. Please check back later.",
      };
    if (games.length < settings.daily_game_count)
      return {
        error:
          "The mission size exceeds the active game pool. Please ask an administrator to review game settings.",
      };
    return repo.assemble({ user, profile, today, settings, games });
  }
  return (user: MissionActor) =>
    lock(`mission:${user.id}`, () => prepare(user));
}
