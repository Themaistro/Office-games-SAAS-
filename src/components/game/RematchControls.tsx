"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  requestGameRematch,
  readGameRematch,
  cancelGameRematch,
} from "@/app/office-lounge/rematch-actions";
import {
  getGamePath,
  type GameType,
} from "@/features/lounge/domain/game-registry";
import {
  rematchMessage,
  rematchState,
  type RematchState,
} from "@/features/lounge/domain/rematch";
import { trackSentInvitation } from "@/lib/sent-invitation";
import { useInvitationActions } from "@/hooks/useInvitationActions";
import InviteSwitchConfirmation from "./InviteSwitchConfirmation";
export default function RematchControls({
  type,
  sourceId,
}: {
  type: GameType;
  sourceId: string;
}) {
  const [state, setState] = useState<RematchState>({
      id: null,
      phase: "idle",
      opponentOnline: true,
      opponentBusy: false,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [readError, setReadError] = useState("");
  const id = useRef<string | null>(null),
    lock = useRef(false),
    generation = useRef(0),
    alive = useRef(true),
    navigated = useRef<string | null>(null);
  const key = `office-games:rematch:${type}:${sourceId}`;
  const registered = useRef<string | null>(null);
  const previous = useRef<RematchState | null>(null);
  const apply = (next: RematchState, clearError = true) => {
    if (!alive.current) return;
    id.current = next.id;
    setState(next);
    if (
      clearError ||
      (previous.current &&
        (previous.current.phase !== next.phase ||
          previous.current.opponentBusy !== next.opponentBusy))
    )
      setError("");
    previous.current = next;
    try {
      if (next.id) sessionStorage.setItem(key, next.id);
      else sessionStorage.removeItem(key);
    } catch {}
    if (next.id && next.phase === "pending" && registered.current !== next.id) {
      registered.current = next.id;
      trackSentInvitation(type, next.id);
    }
    if (next.id && next.phase === "accepted" && navigated.current !== next.id) {
      navigated.current = next.id;
      trackSentInvitation(type, next.id, true);
    }
  };
  const invitations = useInvitationActions({
    toast: setError,
    refresh: async () =>
      apply(rematchState(await readGameRematch(type, sourceId, id.current))),
    clearAlert: () => {},
  });
  async function respond(accept: boolean) {
    if (lock.current || !state.id) return;
    lock.current = true;
    generation.current++;
    setBusy(true);
    try {
      if (accept) await invitations.handleAccept({ id: state.id, type });
      else await invitations.handleDecline({ id: state.id, type });
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    let reading = false;
    try {
      id.current = sessionStorage.getItem(key);
    } catch {}
    const refresh = async () => {
      if (lock.current || reading || document.visibilityState !== "visible")
        return;
      reading = true;
      const version = generation.current;
      try {
        const next = rematchState(
          await readGameRematch(type, sourceId, id.current),
        );
        if (alive.current && version === generation.current) {
          setReadError("");
          apply(next, false);
        }
      } catch (cause) {
        if (alive.current && version === generation.current)
          setReadError(
            cause instanceof Error
              ? cause.message
              : "Could not refresh the invitation.",
          );
      } finally {
        reading = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 1500);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      alive.current = false;
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [type, sourceId, key]);
  async function run(cancel = false) {
    if (lock.current) return;
    lock.current = true;
    generation.current++;
    setBusy(true);
    setError("");
    try {
      apply(
        rematchState(
          cancel && id.current
            ? await cancelGameRematch(type, sourceId, id.current)
            : await requestGameRematch(type, sourceId),
        ),
      );
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not update the rematch.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const pending = state.phase === "pending",
    accepted = state.phase === "accepted";
  return (
    <div className="w-full space-y-2" aria-live="polite">
      <div className="flex flex-wrap gap-2">
        <button
          className="match-button match-button-primary"
          disabled={busy || pending || accepted}
          onClick={() =>
            void (state.phase === "incoming" ? respond(true) : run())
          }
        >
          {busy
            ? "Updating…"
            : pending
              ? "Rematch invite sent"
              : accepted
                ? "Opening rematch…"
                : state.phase === "incoming"
                  ? "Accept rematch"
                  : type === "chess"
                    ? "Rematch · 10 min"
                    : "Invite to rematch"}
        </button>
        {pending && (
          <button
            className="match-button match-button-secondary"
            disabled={busy}
            onClick={() => void run(true)}
          >
            Cancel invitation
          </button>
        )}
        {state.phase === "incoming" && (
          <button
            className="match-button match-button-secondary"
            disabled={busy}
            onClick={() => void respond(false)}
          >
            Decline
          </button>
        )}
        {(accepted || state.phase === "completed") && state.id && (
          <Link
            className="match-button match-button-secondary"
            href={getGamePath(type, state.id)}
          >
            {accepted ? "Open rematch" : "Review rematch"}
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {error || readError || rematchMessage(state)}
      </p>
      <InviteSwitchConfirmation
        confirmation={invitations.challengeConfirmation}
        onClose={() => invitations.setChallengeConfirmation(null)}
        onConfirm={() => {
          const confirmation = invitations.challengeConfirmation;
          invitations.setChallengeConfirmation(null);
          if (confirmation)
            void invitations.acceptChallengeNow(
              confirmation.challenge,
              confirmation.inLiveMatch,
            );
        }}
      />
    </div>
  );
}
