"use client";
import { useState } from "react";
import { acceptChallenge } from "@/app/dashboard/chess/actions";
import { acceptConnectFourChallenge } from "@/app/dashboard/connect-four/actions";
import { acceptPartyInvitation } from "@/app/dashboard/party/actions";
import { acceptTttChallenge } from "@/app/dashboard/ttt/actions";

type InvitationTarget = { id: string; type: string };
export function useInvitationActions({
  toast,
  refresh,
  clearAlert,
}: {
  toast: (message: string) => void;
  refresh: () => Promise<void>;
  clearAlert: () => void;
}) {
  const [challengeConfirmation, setChallengeConfirmation] = useState<{
    challenge: InvitationTarget;
    inDailyMission: boolean;
    inLiveMatch: boolean;
  } | null>(null);
  const handleAccept = async (challenge: InvitationTarget) => {
    try {
      const response = await fetch("/api/me/activity", { cache: "no-store" });
      if (!response.ok)
        throw new Error("Could not check your current game. Please retry.");
      const activity = await response.json();
      const inDailyMission = Boolean(activity.mission),
        inLiveMatch = Boolean(activity.activeMatch);
      if (inDailyMission || inLiveMatch) {
        setChallengeConfirmation({
          challenge,
          inDailyMission: inDailyMission && !inLiveMatch,
          inLiveMatch,
        });
        return;
      }
    } catch {
      toast("Could not check your current game. Please retry.");
      return;
    }
    await acceptChallengeNow(challenge);
  };

  const acceptChallengeNow = async (
    challenge: InvitationTarget,
    replaceActive = false,
  ) => {
    try {
      if (challenge.type === "party") {
        await acceptPartyInvitation(challenge.id, replaceActive);
      } else if (challenge.type === "chess") {
        await acceptChallenge(challenge.id, replaceActive);
      } else if (challenge.type === "ttt") {
        await acceptTttChallenge(challenge.id, replaceActive);
      } else {
        await acceptConnectFourChallenge(challenge.id, replaceActive);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again.";
      if (message === "NEXT_REDIRECT") throw err;
      toast("Failed to join game: " + message);
    }
  };

  const handleDecline = async (challenge: InvitationTarget) => {
    try {
      const response = await fetch("/api/challenges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: challenge.id, type: challenge.type }),
      });
      if (!response.ok)
        throw new Error("Could not decline this invitation. Please try again.");
      clearAlert();
      await refresh();
    } catch {
      toast("Could not decline this invitation. Please try again.");
    }
  };

  return {
    handleAccept,
    handleDecline,
    acceptChallengeNow,
    challengeConfirmation,
    setChallengeConfirmation,
  };
}
