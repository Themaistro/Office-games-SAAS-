import Ably from "ably";
import "server-only";
import { getGameChannelName } from "../../lib/realtime";

export type RealtimeEvent = {
  type: string;
  senderId?: string;
  payload?: Record<string, unknown>;
};
let publisher: { key: string; client: Ably.Rest } | undefined;

export function getRealtimePublisher() {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  if (!publisher || publisher.key !== key)
    publisher = { key, client: new Ably.Rest(key) };
  return publisher.client;
}

export async function publishGameEvent(
  type: string,
  id: string,
  event: RealtimeEvent,
) {
  const client = getRealtimePublisher();
  if (!client) return false;
  await client.channels
    .get(getGameChannelName(type, id))
    .publish(event.type, event);
  return true;
}
