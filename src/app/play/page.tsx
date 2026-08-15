"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Trophy, AlertTriangle, Home } from "lucide-react";
import GameEngine from "@/components/game/GameEngine";
import { startDailySession, fetchSessionQuestions, endSession } from "./actions";
import { SessionQuestion } from "@/types/game";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [globalTimeLeft, setGlobalTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    async function initSession() {
      try {
        const result = await startDailySession();
        if (result.error) {
          router.push("/dashboard");
          return;
        }

        const activeSession = result.session;
        setSession(activeSession);

        // Fetch the questions for the game engine
        const sqs = await fetchSessionQuestions(activeSession.id);
        setQuestions(sqs);

        // Initialize global timer
        if (activeSession.created_at && activeSession.allowed_duration_seconds) {
          const createdAt = new Date(activeSession.created_at).getTime();
          const elapsed = Math.floor((Date.now() - createdAt) / 1000);
          const remaining = Math.max(0, activeSession.allowed_duration_seconds - elapsed);
          setGlobalTimeLeft(remaining);
        }
      } catch (err) {
        console.error(err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [router]);

  useEffect(() => {
    if (globalTimeLeft === null || globalTimeLeft <= 0 || finishing) return;

    const interval = setInterval(() => {
      setGlobalTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          handleEndSession(session.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [globalTimeLeft, finishing, session]);

  const handleEndSession = async (sessionId: string) => {
    if (finishing) return;
    setFinishing(true);
    await endSession(sessionId);
  };


  if (loading || !session || questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background flex-col gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse text-sm">Preparing your mission...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold">
          <Trophy className="text-primary" size={20} />
          <span className="hidden sm:inline">Daily Mission</span>
        </div>

        {globalTimeLeft !== null && (
          <div className={`flex items-center gap-2 font-mono font-bold px-4 py-1.5 rounded-full shadow-sm ${
            globalTimeLeft < 60 
              ? 'bg-destructive/10 text-destructive animate-pulse border border-destructive/20' 
              : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            <Clock size={16} />
            <span>
              {Math.floor(globalTimeLeft / 60).toString().padStart(2, '0')}:
              {(globalTimeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}

        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary/50"
        >
          <Home size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>
      </header>

      {/* Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
        {questions.length > 0 ? (
          <GameEngine 
            sessionQuestions={questions} 
            onComplete={() => handleEndSession(session.id)} 
          />
        ) : (
          <div className="text-muted-foreground">No questions assigned to this session.</div>
        )}
      </main>
    </div>
  );
}
