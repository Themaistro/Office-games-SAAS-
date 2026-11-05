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
  table: string;
  playerColumns: readonly [string, string];
  winStatuses: readonly [string, string];
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
    table: "chess_games",
    playerColumns: ["white_player_id", "black_player_id"],
    winStatuses: ["white_won", "black_won"],
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
    table: "ttt_games",
    playerColumns: ["x_player_id", "o_player_id"],
    winStatuses: ["x_won", "o_won"],
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
    table: "connect_four_games",
    playerColumns: ["red_player_id", "yellow_player_id"],
    winStatuses: ["red_won", "yellow_won"],
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
