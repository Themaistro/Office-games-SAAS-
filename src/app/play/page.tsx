"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Trophy, AlertTriangle } from "lucide-react";
import GameEngine from "@/components/game/GameEngine";
import { startDailySession, fetchSessionQuestions, endSession } from "./actions";
import { SessionQuestion } from "@/components/game/types/game";

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(900);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

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

        // Calculate initial time left
        const sessionStart = new Date(activeSession.created_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - sessionStart) / 1000);
        const remaining = Math.max(0, activeSession.allowed_duration_seconds - elapsedSeconds);
        
        setTimeLeft(remaining);

        if (remaining <= 0 && !activeSession.is_completed) {
          handleEndSession(activeSession.id);
          return;
        }

        // Fetch the questions for the game engine
        const sqs = await fetchSessionQuestions(activeSession.id);
        setQuestions(sqs);
      } catch (err) {
        console.error(err);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [router]);

  // Timer loop
  useEffect(() => {
    if (loading || finishing || !session || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndSession(session.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, finishing, session, timeLeft]);

  const handleEndSession = async (sessionId: string) => {
    setFinishing(true);
    await endSession(sessionId);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isLowTime = timeLeft <= 60;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-card shadow-sm px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold">
          <Trophy className="text-primary" size={20} />
          <span>Daily Mission Active</span>
        </div>
        
        <div className={`flex items-center gap-2 font-mono text-xl md:text-2xl font-bold px-4 py-1.5 rounded-lg ${isLowTime ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}>
          {isLowTime ? <AlertTriangle size={20} className="text-destructive" /> : <Clock size={20} />}
          {formatTime(timeLeft)}
        </div>
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
