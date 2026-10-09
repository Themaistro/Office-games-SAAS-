/**
 * Canonical integration contract for every Office Lounge game.
 *
 * A game is not considered lounge-ready until it is registered here and its
 * server actions implement the same lifecycle: waiting, accepted/in_progress,
 * completed, declined/cancelled, join, resign, and spectator access.
 */
export type GameType = "chess" | "ttt" | "connect-four";

export type GameDefinition = {
  type: GameType;
  label: string;
  shortLabel: string;
  route: string;
  supportsDirectChallenges: true;
  supportsPublicLobby: true;
  supportsSpectators: true;
  supportsResign: true;
};

export const GAME_REGISTRY: Record<GameType, GameDefinition> = {
  chess: {
    type: "chess",
    label: "Chess",
    shortLabel: "Chess",
    route: "chess",
    supportsDirectChallenges: true,
    supportsPublicLobby: true,
    supportsSpectators: true,
    supportsResign: true,
  },
  ttt: {
    type: "ttt",
    label: "Tic-Tac-Toe",
    shortLabel: "Tic Tac Toe",
    route: "ttt",
    supportsDirectChallenges: true,
    supportsPublicLobby: true,
    supportsSpectators: true,
    supportsResign: true,
  },
  "connect-four": {
    type: "connect-four",
    label: "Connect Four",
    shortLabel: "Connect Four",
    route: "connect-four",
    supportsDirectChallenges: true,
    supportsPublicLobby: true,
    supportsSpectators: true,
    supportsResign: true,
  },
};

export const GAME_TYPES = Object.keys(GAME_REGISTRY) as GameType[];

export function getGameDefinition(type: string): GameDefinition | undefined {
  return GAME_REGISTRY[type as GameType];
}

export function getGameLabel(type: string): string {
  return getGameDefinition(type)?.label || "Game";
}

export function getGamePath(type: string, id: string): string {
  const definition = getGameDefinition(type);
  if (!definition) throw new Error(`Unsupported game type: ${type}`);
  return `/dashboard/${definition.route}/${id}`;
}
