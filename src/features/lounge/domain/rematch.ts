export type RematchPhase =
  | "idle"
  | "pending"
  | "incoming"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired"
  | "completed"
  | "unavailable";
export type RematchState = {
  id: string | null;
  phase: RematchPhase;
  opponentOnline: boolean;
  opponentBusy: boolean;
  declinedByMe?: boolean;
};
export type RematchResponse =
  { ok: true; state: RematchState } | { ok: false; error: string };
export function rematchState(response: RematchResponse) {
  if (!response.ok) throw new Error(response.error);
  return response.state;
}
export function rematchMessage(state: RematchState) {
  const messages: Record<RematchPhase, string> = {
    idle: "Invite your opponent to play again.",
    pending: "Waiting for your opponent. You can cancel this invitation.",
    incoming: "Your opponent has invited you to a rematch.",
    accepted: "Rematch accepted. Opening the new game…",
    declined: "Your opponent declined. You can send another invitation.",
    cancelled: "The invitation was cancelled.",
    expired: "The invitation expired without a response.",
    completed: "That rematch has finished. You can invite them again.",
    unavailable: "This invitation is no longer available.",
  };
  const context = ["pending", "incoming"].includes(state.phase)
    ? state.opponentBusy
      ? state.phase === "incoming"
        ? " They have started another game and must finish or leave it before you can join."
        : " They are playing another match and will be warned before accepting."
      : !state.opponentOnline
        ? " They are not online right now; the invitation will wait for them."
        : ""
    : "";
  return (
    (state.phase === "declined" && state.declinedByMe
      ? "You declined the invitation. You can invite them again."
      : messages[state.phase]) + context
  );
}
