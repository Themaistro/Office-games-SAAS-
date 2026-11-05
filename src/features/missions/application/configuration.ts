import {
  validateMissionSize,
  validateRoundCounts,
} from "../domain/configuration";

export interface MissionConfigurationWriter {
  activeCount(): Promise<number>;
  missionSize(): Promise<number>;
  setMissionSize(count: number): Promise<void>;
  setGameStatus(id: string, expected: boolean, next: boolean): Promise<boolean>;
  setRounds(
    id: string,
    easy: number,
    medium: number,
    hard: number,
  ): Promise<boolean>;
}
export interface MissionConfigurationRepository {
  // Locks the singleton settings row to serialize size changes and deactivations.
  locked<T>(
    work: (writer: MissionConfigurationWriter) => Promise<T>,
  ): Promise<T>;
}

export function createMissionConfigurationService(
  repository: MissionConfigurationRepository,
) {
  return {
    setRounds: (id: string, easy: number, medium: number, hard: number) =>
      repository.locked(async (writer) => {
        validateRoundCounts(easy, medium, hard);
        if (!(await writer.setRounds(id, easy, medium, hard)))
          throw new Error("Game not found. Refresh and try again.");
      }),
    setSize: (count: number) =>
      repository.locked(async (writer) => {
        validateMissionSize(count, await writer.activeCount());
        await writer.setMissionSize(count);
      }),
    toggleGame: (id: string, current: boolean) =>
      repository.locked(async (writer) => {
        if (current)
          validateMissionSize(
            await writer.missionSize(),
            (await writer.activeCount()) - 1,
          );
        if (!(await writer.setGameStatus(id, current, !current))) {
          throw new Error(
            "This game was changed elsewhere. Refresh and try again.",
          );
        }
      }),
  };
}
