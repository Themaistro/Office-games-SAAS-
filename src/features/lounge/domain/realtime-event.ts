export type MatchEvent = {
  type: "move" | "chat" | "offer_draw" | "decline_draw" | "game_finished";
  senderId?: string;
  payload?: {
    fen?: string;
    pgn?: string;
    status?: string;
    reason?: string;
    text?: string;
    last_move_timestamp?: string;
    white_time_ms?: number;
    black_time_ms?: number;
  };
};
export function parseMatchEvent(value: unknown): MatchEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = { ...value } as Record<string, unknown>;
  if (
    typeof event.type !== "string" ||
    !["move", "chat", "offer_draw", "decline_draw", "game_finished"].includes(
      event.type,
    )
  )
    return null;
  if (event.senderId !== undefined && typeof event.senderId !== "string")
    return null;
  if (event.payload !== undefined) {
    if (
      !event.payload ||
      typeof event.payload !== "object" ||
      Array.isArray(event.payload)
    )
      return null;
    const payload = { ...event.payload } as Record<string, unknown>;
    event.payload = payload;
    for (const key of [
      "fen",
      "pgn",
      "status",
      "text",
      "reason",
      "last_move_timestamp",
    ])
      if (payload[key] !== undefined && typeof payload[key] !== "string")
        return null;
    for (const key of ["white_time_ms", "black_time_ms"]) {
      if (typeof payload[key] === "string" && /^\d+$/.test(payload[key]))
        payload[key] = Number(payload[key]);
      if (
        payload[key] !== undefined &&
        (typeof payload[key] !== "number" ||
          !Number.isFinite(payload[key]) ||
          payload[key] < 0)
      )
        return null;
    }
  }
  return event as MatchEvent;
}
