import { publishGameEvent, type RealtimeEvent } from "@/lib/realtime";

export type ChessRealtimeEvent = RealtimeEvent & {
  type: "move" | "chat" | "offer_draw" | "decline_draw" | "game_finished";
};

export async function publishChessEvent(gameId: string, event: ChessRealtimeEvent) {
  return publishGameEvent("chess", gameId, event);
}
