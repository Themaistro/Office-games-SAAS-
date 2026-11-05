import type { GameType } from "@/features/lounge/domain/game-registry";
export const SENT_INVITATION_EVENT = "office-games:sent-invitation";
export function trackSentInvitation(
  type: GameType,
  id: string,
  accepted = false,
) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent(SENT_INVITATION_EVENT, {
        detail: { type, id, accepted },
      }),
    );
}
