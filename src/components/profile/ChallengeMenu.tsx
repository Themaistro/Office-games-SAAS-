"use client";

import React, { useState, useRef, useEffect } from "react";
import { Target, Swords, X as XIcon, Loader2 } from "lucide-react";
import { challengeUserToChess } from "@/app/dashboard/chess/actions";
import { challengeUserToTtt } from "@/app/dashboard/ttt/actions";

export default function ChallengeMenu({ targetUserId }: { targetUserId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<"chess" | "ttt" | null>(null);
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

  const handleChallenge = async (type: "chess" | "ttt") => {
    setLoading(type);
    try {
      if (type === "chess") {
        await challengeUserToChess(targetUserId, 600000); // default 10min
      } else {
        await challengeUserToTtt(targetUserId);
      }
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") {
        return; // Normal
      }
      alert(err.message || "Failed to challenge user");
      setLoading(null);
    }
  };

  return (
    <div id="tour-challenge-menu" className="relative w-full" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl font-bold shadow-sm transition-colors text-sm w-full"
      >
        <Target size={16} /> Challenge
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-[200px] bg-card border border-border shadow-xl rounded-2xl p-2 z-50 flex flex-col gap-1">
          <button
            onClick={() => handleChallenge("chess")}
            disabled={loading !== null}
            className="flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            {loading === "chess" ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Swords size={16} className="text-orange-500" />}
            Chess
          </button>
          
          <button
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
