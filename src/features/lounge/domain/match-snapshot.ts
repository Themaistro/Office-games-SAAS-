import { GAME_REGISTRY, type GameType } from "./game-registry";
export type MatchIdentity = { id: string; status: string; updated_at?: string };
export function assertMatchSnapshot(
  value: unknown,
  type: GameType,
  id: string,
): asserts value is MatchIdentity {
  if (!value || typeof value !== "object")
    throw new Error("Invalid match snapshot");
  const row = value as Record<string, unknown>,
    definition = GAME_REGISTRY[type];
  if (
    row.id !== id ||
    typeof row.status !== "string" ||
    !["waiting", "in_progress", "draw", ...definition.winStatuses].includes(
      row.status,
    )
  )
    throw new Error("Invalid match identity or status");
  if (
    row.updated_at !== undefined &&
    (typeof row.updated_at !== "string" ||
      !Number.isFinite(Date.parse(row.updated_at)))
  )
    throw new Error("Invalid match revision");
  if (definition.board) {
    const board = definition.board;
    if (
      typeof row.board_state !== "string" ||
      row.board_state.length !== board.cells ||
      ![...row.board_state].every((cell) => board.symbols.includes(cell))
    )
      throw new Error("Invalid match board");
    if (!board.turns.includes(String(row.current_turn)))
      throw new Error("Invalid match turn");
  }
}
export function isOlderSnapshot(next: MatchIdentity, current: MatchIdentity) {
  return Boolean(
    next.updated_at &&
    current.updated_at &&
    new Date(next.updated_at).getTime() <
      new Date(current.updated_at).getTime(),
  );
}

export type ChessSnapshot = MatchIdentity & {
  pgn: string | null;
  fen: string;
  white_player_id: string | null;
  black_player_id: string | null;
  white_time_ms: number;
  black_time_ms: number;
  last_move_timestamp: string | null;
  online_player_ids: string[];
  spectators: { id: string; full_name: string; avatar_url?: string | null }[];
  events: {
    id: string;
    created_at: string;
    sender_id: string;
    full_name: string;
    event_type: string;
    payload: { text?: string };
  }[];
};
export function parseChessSnapshot(value: unknown, id: string): ChessSnapshot {
  assertMatchSnapshot(value, "chess", id);
  const row = { ...value } as MatchIdentity & Record<string, unknown>;
  if (
    typeof row.fen !== "string" ||
    (row.pgn !== null && typeof row.pgn !== "string")
  )
    throw new Error("Invalid chess position");
  for (const key of ["white_time_ms", "black_time_ms"]) {
    if (typeof row[key] === "string" && /^\d+$/.test(row[key]))
      row[key] = Number(row[key]);
    if (
      typeof row[key] !== "number" ||
      !Number.isFinite(row[key]) ||
      row[key] < 0
    )
      throw new Error("Invalid chess clock");
  }
  for (const key of [
    "white_player_id",
    "black_player_id",
    "last_move_timestamp",
  ])
    if (row[key] !== null && typeof row[key] !== "string")
      throw new Error("Invalid chess metadata");
  if (
    !Array.isArray(row.online_player_ids) ||
    !row.online_player_ids.every((id) => typeof id === "string")
  )
    throw new Error("Invalid chess presence");
  if (
    !Array.isArray(row.spectators) ||
    !row.spectators.every(
      (person) =>
        person &&
        typeof person === "object" &&
        typeof person.id === "string" &&
        typeof person.full_name === "string",
    )
  )
    throw new Error("Invalid chess spectators");
  if (
    !Array.isArray(row.events) ||
    !row.events.every(
      (event) =>
        event &&
        typeof event === "object" &&
        ["id", "created_at", "sender_id", "full_name", "event_type"].every(
          (key) => typeof event[key] === "string",
        ) &&
        event.payload &&
        typeof event.payload === "object" &&
        (event.payload.text === undefined ||
          typeof event.payload.text === "string"),
    )
  )
    throw new Error("Invalid chess events");
  return row as ChessSnapshot;
}
