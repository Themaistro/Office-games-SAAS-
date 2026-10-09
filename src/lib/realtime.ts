import Ably from "ably";

/**
 * Shared realtime contract for every live game and collaborative surface.
 * Add new event names to the feature's event union, not to the transport.
 */
export type RealtimeEvent = {
  type: string;
  senderId?: string;
  payload?: Record<string, unknown>;
};

export function getGameChannelName(gameType: string, gameId: string) {
  return `game:${gameType}:${gameId}`;
}

export async function publishGameEvent(
  gameType: string,
  gameId: string,
  event: RealtimeEvent,
) {
  const key = process.env.ABLY_API_KEY;
  if (!key) return false;

  const client = new Ably.Rest(key);
  await client.channels.get(getGameChannelName(gameType, gameId)).publish(event.type, event);
  return true;
}
