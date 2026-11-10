"use client";
import * as Ably from "ably";
import { useEffect, useRef } from "react";
import { getGameChannelName } from "@/lib/realtime";

/** Reusable subscription health; attached channel, not merely an open socket. */
export function useGameRealtime(
  type: string,
  id: string,
  receive: (message: Ably.Message) => void,
  recover: () => void,
  enabled = true,
) {
  const healthy = useRef(false);
  const handler = useRef(receive),
    recovered = useRef(recover);
  useEffect(() => {
    handler.current = receive;
    recovered.current = recover;
  });
  useEffect(() => {
    if (!enabled) {
      healthy.current = false;
      return;
    }
    let active = true;
    const realtime = new Ably.Realtime({
      authUrl: `/api/realtime?type=${type}&id=${id}`,
      echoMessages: false,
    });
    const channel = realtime.channels.get(getGameChannelName(type, id));
    const markHealthy = () => {
      healthy.current =
        realtime.connection.state === "connected" &&
        channel.state === "attached";
      if (healthy.current && active) recovered.current();
    };
    const unhealthy = () => {
      healthy.current = false;
    };
    const message = (event: Ably.Message) => {
      if (active) handler.current(event);
    };
    realtime.connection.on("connected", markHealthy);
    for (const event of [
      "disconnected",
      "suspended",
      "failed",
      "closed",
    ] as const)
      realtime.connection.on(event, unhealthy);
    channel.on("attached", markHealthy);
    for (const event of ["detached", "suspended", "failed"] as const)
      channel.on(event, unhealthy);
    void channel.subscribe(message).catch(unhealthy);
    return () => {
      active = false;
      unhealthy();
      channel.unsubscribe(message);
      channel.off();
      realtime.connection.off();
      realtime.close();
    };
  }, [type, id, enabled]);
  return healthy;
}
