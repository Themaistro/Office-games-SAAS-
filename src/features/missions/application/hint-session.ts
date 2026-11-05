import { missionDeadline, type DailyMissionSession } from "../domain/session";

export interface HintWriter {
  session: DailyMissionSession | null;
  slug: string;
  earlierPending: boolean;
  hintsUsed: number;
  claim(): Promise<boolean>;
  options(): Promise<{ options: string[]; correctAnswer: string }>;
}
export interface HintRepository {
  locked<T>(
    id: string,
    userId: string,
    work: (writer: HintWriter) => Promise<T>,
  ): Promise<T>;
}
export function createHintService(repository: HintRepository, now = Date.now) {
  return (id: string, userId: string) =>
    repository.locked(id, userId, async (writer) => {
      if (!writer.session || writer.session.status !== "in_progress")
        throw new Error("Mission is not active");
      if (
        [
          "reaction",
          "stroop",
          "typing",
          "typing-challenge",
          "sequence",
        ].includes(writer.slug)
      )
        throw new Error("Hints are not available for this game");
      if (writer.earlierPending)
        throw new Error("Complete the current challenge first");
      if (now() >= missionDeadline(writer.session))
        throw new Error("Mission time has ended");
      const left = Math.max(0, 3 - writer.hintsUsed);
      if (!left) throw new Error("No hints remaining");
      if (!(await writer.claim())) throw new Error("Hint unavailable");
      const hint = await writer.options();
      return {
        remaining: left - 1,
        eliminatedOptions: hint.options
          .filter((option) => option !== hint.correctAnswer)
          .slice(0, 2),
      };
    });
}
