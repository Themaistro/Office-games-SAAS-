"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, Target, Swords, X as XIcon, Loader2 } from "lucide-react";
import { challengeUserToChess, cancelChessGame } from "@/app/dashboard/chess/actions";
import { challengeUserToTtt, cancelTttGame } from "@/app/dashboard/ttt/actions";
import { challengeUserToConnectFour, cancelConnectFourGame } from "@/app/dashboard/connect-four/actions";
import { getGamePath, type GameType } from "@/lib/game-registry";

export default function ChallengeMenu({ targetUserId, compact = false }: { targetUserId: string; compact?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<GameType | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [acceptedType, setAcceptedType] = useState<GameType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const navigatingRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const loadPending = async () => {
      const response = await fetch(`/api/challenges?sent=1&to=${targetUserId}`, { cache: "no-store" });
      if (!active || !response.ok) return;
      const pending = await response.json();
      if (pending[0]?.status === "in_progress") {
        setAcceptedId(pending[0].id);
        setAcceptedType(pending[0].type);
        setPendingId(null);
        setSent(null);
        // The recipient accepting a direct challenge starts the match for both
        // players. Move the sender into that match immediately instead of
        // making them discover a second "Return" action.
        const destination = getGamePath(pending[0].type, pending[0].id);
        if (navigatingRef.current !== destination && window.location.pathname !== destination) {
          navigatingRef.current = destination;
          router.push(destination);
        }
      } else if (pending[0]) {
        setPendingId(pending[0].id);
        setSent(pending[0].type);
        setAcceptedId(null);
        setAcceptedType(null);
      } else {
        setPendingId(null);
        setSent(null);
        setAcceptedId(null);
        setAcceptedType(null);
      }
    };
    loadPending();
    const timer = window.setInterval(loadPending, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [router, targetUserId]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleChallenge = async (type: "chess" | "ttt" | "connect-four") => {
    setLoading(type);
    setError(null);
    try {
      let result: { id: string };
      if (type === "chess") {
        result = await challengeUserToChess(targetUserId, 600000); // default 10min
      } else if (type === "ttt") {
        result = await challengeUserToTtt(targetUserId);
      } else {
        result = await challengeUserToConnectFour(targetUserId);
      }
      setSent(type);
      setPendingId(result.id);
      setIsOpen(false);
      setLoading(null);
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") {
        return; // Normal
      }
      setError(err.message || "Failed to challenge user");
      setLoading(null);
    }
  };

  const cancelPending = async () => {
    if (!pendingId) return;
    if (sent === "chess") await cancelChessGame(pendingId);
    else if (sent === "ttt") await cancelTttGame(pendingId);
    else await cancelConnectFourGame(pendingId);
    setPendingId(null);
    setSent(null);
    setError(null);
    setLoading(null);
  };

  return (
    <div id="tour-challenge-menu" className={`relative ${compact ? "w-auto" : "w-full"}`} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Challenge this player"
        className={compact ? "flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90" : "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"}
      >
        <Target size={16} /> {!compact && "Challenge"}
      </button>
      {sent && pendingId && <div className={compact ? "absolute right-0 top-full z-[210] mt-2 flex w-64 items-center gap-2 rounded-xl border border-emerald-500/20 bg-card px-3 py-2 text-xs font-bold text-emerald-700 shadow-xl" : "mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-xs font-bold text-emerald-700"}><span className="min-w-0 flex-1">Challenge sent — waiting for their response.</span><button onClick={cancelPending} className="shrink-0 rounded-lg px-1.5 py-1 underline hover:bg-emerald-500/10">Cancel</button></div>}
      {acceptedId && acceptedType && <div className={compact ? "absolute right-0 top-full z-[210] mt-2 flex w-64 items-center gap-2 rounded-xl border border-primary/20 bg-card px-3 py-2 text-xs font-bold text-primary shadow-xl" : "mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary"}><span className="min-w-0 flex-1">Match accepted — opening your game…</span><button onClick={() => router.push(getGamePath(acceptedType, acceptedId))} className="shrink-0 rounded-lg bg-primary px-2 py-1 text-primary-foreground">Open</button></div>}
      {error && <p role="alert" className={compact ? "absolute right-0 top-full z-[210] mt-2 w-64 rounded-xl border border-destructive/20 bg-card px-3 py-2 text-center text-xs font-bold text-destructive shadow-xl" : "mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs font-bold text-destructive"}>{error}</p>}

      {isOpen && (
        <div className="absolute right-0 top-full z-[200] mt-2 flex w-[220px] flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl">
          <button
            role="menuitem"
            onClick={() => handleChallenge("chess")}
            disabled={loading !== null}
            className="flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            {loading === "chess" ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Swords size={16} className="text-orange-500" />}
            Chess
          </button>

          <button
            role="menuitem"
            onClick={() => handleChallenge("connect-four")}
            disabled={loading !== null}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {loading === "connect-four" ? <Loader2 size={16} className="animate-spin text-violet-500" /> : <CircleDot size={16} className="text-violet-500" />}
            Connect Four
          </button>
          
          <button
            role="menuitem"
            onClick={() => handleChallenge("ttt")}
            disabled={loading !== null}
            className="flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            {loading === "ttt" ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <XIcon size={16} className="text-blue-500" />}
            Tic Tac Toe
          </button>
        </div>
      )}
    </div>
  );
}

