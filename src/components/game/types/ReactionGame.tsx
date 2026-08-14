import { GameProps } from "@/types/game";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Zap } from "lucide-react";

export default function ReactionGame({ question, onAnswer, isSubmitting }: GameProps) {
  const [gameState, setGameState] = useState<'idle' | 'flashing' | 'go' | 'early' | 'done' | 'timeout'>('idle');
  const [startTime, setStartTime] = useState<number>(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [currentColor, setCurrentColor] = useState<string>('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const goTimerRef = useRef<NodeJS.Timeout | null>(null);

  const difficulty = question.difficulty || 'medium';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
    };
  }, []);

  const scheduleNextFlash = (decoysLeft: number) => {
    if (decoysLeft > 0) {
      setGameState('flashing');
      const colors = ["bg-red-500", "bg-yellow-500", "bg-purple-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500", "bg-blue-500"];
      setCurrentColor(colors[Math.floor(Math.random() * colors.length)]);
      
      // Each decoy flashes for 400ms to 800ms
      const flashDuration = Math.floor(Math.random() * 400) + 400;
      
      timerRef.current = setTimeout(() => {
        // Very brief empty pause between flashes? Or just immediate? 
        // Let's do a tiny gap so it looks like distinct flashes
        setCurrentColor("bg-slate-800"); 
        timerRef.current = setTimeout(() => {
          scheduleNextFlash(decoysLeft - 1);
        }, 100);
      }, flashDuration);
      
    } else {
      // Show Target (Green)
      setGameState('go');
      setCurrentColor("bg-green-500");
      setStartTime(Date.now());
      
      // The green flash duration (they must click before it vanishes!)
      const maxGoTime = difficulty === 'easy' ? 1000 : (difficulty === 'medium' ? 600 : 400);

      goTimerRef.current = setTimeout(() => {
        setGameState('timeout');
        setCurrentColor("bg-slate-800");
        onAnswer("Missed it!", false, maxGoTime / 1000);
      }, maxGoTime);
    }
  };

  const startGame = () => {
    // 2 to 6 decoy flashes before green appears
    const decoyCount = Math.floor(Math.random() * 5) + 2; 
    scheduleNextFlash(decoyCount);
  };

  const handleClick = () => {
    if (isSubmitting || gameState === 'timeout') return;

    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'flashing') {
      // Clicked on a decoy color
      if (timerRef.current) clearTimeout(timerRef.current);
      setGameState('early');
      onAnswer("Wrong Color!", false, 0); 
    } else if (gameState === 'go') {
      // Success! Calculate reaction time
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
      const timeMs = Date.now() - startTime;
      setReactionTime(timeMs);
      setGameState('done');
      
      // Submit answer.
      const isCorrect = true; 
      onAnswer(`${timeMs}ms`, isCorrect, timeMs / 1000);
    }
  };

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'idle': return "bg-blue-500 border-blue-400/50";
      case 'flashing': return `${currentColor} border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.4)]`;
      case 'go': return "bg-green-500 border-green-400 shadow-[0_0_50px_rgba(34,197,94,0.6)]";
      case 'early': return "bg-slate-700 border-slate-600";
      case 'timeout': return "bg-slate-700 border-slate-600";
      case 'done': return "bg-blue-600 border-blue-500";
      default: return "bg-slate-800";
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Zap className="text-yellow-500" /> Reaction Speed
      </h2>

      <div className="mb-4 text-center px-4 h-12">
        {gameState === 'idle' && (
          <p className="text-muted-foreground">Click START, then wait... only click when it flashes <strong className="text-green-500">GREEN</strong>!</p>
        )}
        {gameState === 'flashing' && <p className="text-lg font-medium text-foreground">Wait for green...</p>}
        {gameState === 'go' && <p className="text-2xl font-black text-green-500 animate-bounce">CLICK NOW!</p>}
        {gameState === 'early' && <p className="text-xl font-bold text-destructive">Wrong color! You clicked a decoy!</p>}
        {gameState === 'timeout' && <p className="text-xl font-bold text-destructive">Too slow! You missed the green flash!</p>}
        {gameState === 'done' && <p className="text-xl font-bold text-primary">Great job!</p>}
      </div>

      <button
        onClick={handleClick}
        disabled={isSubmitting || gameState === 'early' || gameState === 'done' || gameState === 'timeout'}
        className={clsx(
          "relative w-full max-w-sm aspect-square rounded-3xl flex flex-col items-center justify-center text-4xl font-black shadow-2xl transition-all border-4 text-white select-none",
          getBackgroundColor(),
          (gameState === 'idle' || gameState === 'go' || gameState === 'flashing') ? "cursor-pointer active:scale-95" : "cursor-default",
          (gameState === 'idle') ? "hover:scale-[1.02]" : "",
          (isSubmitting || gameState === 'early' || gameState === 'timeout') ? "opacity-80" : ""
        )}
      >
        {gameState === 'idle' && <span className="drop-shadow-md">START</span>}
        {gameState === 'flashing' && <span className="drop-shadow-md opacity-0">WAIT</span>}
        {gameState === 'go' && <span className="drop-shadow-md">CLICK!</span>}
        {gameState === 'early' && <span className="drop-shadow-md text-2xl text-center px-4 text-white/90">TOO EARLY</span>}
        {gameState === 'timeout' && <span className="drop-shadow-md text-2xl text-center px-4 text-white/90">MISSED IT</span>}
        {gameState === 'done' && <span className="drop-shadow-md">{reactionTime} ms</span>}
      </button>
    </div>
  );
}
