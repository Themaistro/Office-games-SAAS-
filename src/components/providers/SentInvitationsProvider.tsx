"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useSharedPolling } from "@/hooks/useSharedPolling";
import {
  getGameDefinition,
  type GameType,
} from "@/features/lounge/domain/game-registry";
import { SENT_INVITATION_EVENT } from "@/lib/sent-invitation";

type Invitation = {
  id: string;
  type: GameType;
  status: string;
  challenged_id: string | null;
};
const Context = createContext<{
  invitations: Invitation[] | undefined;
  refresh: () => Promise<void>;
}>({ invitations: undefined, refresh: async () => {} });

/** One adaptive read for every challenge button and sender-navigation consumer. */
export function SentInvitationsProvider({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const [invitations, setInvitations] = useState<Invitation[] | undefined>();
  const [urgent, setUrgent] = useState(false);
  const snapshot = useSharedPolling<Invitation[]>(
    "/api/challenges?sent=1",
    15000,
    userId ?? "guest",
    Boolean(userId),
  );
  useEffect(() => {
    if (!urgent) return;
    const timer = window.setInterval(() => void snapshot.refresh(), 1000);
    return () => window.clearInterval(timer);
  }, [urgent, snapshot.refresh]);
  useEffect(() => {
    if (!Array.isArray(snapshot.data)) return;
    const rows = snapshot.data.filter(
      (row) => row && typeof row.id === "string" && getGameDefinition(row.type),
    );
    setInvitations(rows);
    setUrgent(rows.some((row) => row.status === "waiting"));
  }, [snapshot.data]);
  useEffect(() => {
    const sent = () => {
      setUrgent(true);
      void snapshot.invalidate();
    };
    window.addEventListener(SENT_INVITATION_EVENT, sent);
    return () => window.removeEventListener(SENT_INVITATION_EVENT, sent);
  }, [snapshot.invalidate]);
  return (
    <Context.Provider value={{ invitations, refresh: snapshot.invalidate }}>
      {children}
    </Context.Provider>
  );
}

export const useSentInvitations = () => useContext(Context);
