export function validateMissionSize(count: number, activeGames: number) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 20 ||
    count > activeGames
  ) {
    throw new Error(
      `Choose 1–${Math.min(20, activeGames)} games per day from the active catalog.`,
    );
  }
}

export function validateRoundCounts(
  easy: number,
  medium: number,
  hard: number,
) {
  const rounds = [easy, medium, hard];
  if (
    !rounds.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 10,
    ) ||
    rounds.reduce((sum, value) => sum + value, 0) === 0
  ) {
    throw new Error(
      "Round counts must be whole numbers between 0 and 10, with at least one round enabled.",
    );
  }
}
