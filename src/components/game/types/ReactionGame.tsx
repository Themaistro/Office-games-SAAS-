import { GameProps } from "@/types/game";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Zap } from "lucide-react";

export default function ReactionGame({ onAnswer, isSubmitting }: GameProps) {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'go' | 'early' | 'done' | 'timeout'>('idle');
  const [startTime, setStartTime] = useState<number>(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const goTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start idle timer when component mounts (they have 10 seconds to click start)
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    idleTimerRef.current = setTimeout(() => {
      setGameState('timeout');
      onAnswer("Too Slow!", false, 10);
    }, 10000);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [onAnswer]);

  const startGame = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setGameState('waiting');
    // Random wait between 2 to 5 seconds
    const randomDelay = Math.floor(Math.random() * 3000) + 2000;
    
    timerRef.current = setTimeout(() => {
      setGameState('go');
      setStartTime(Date.now());
      
      // If they don't click within 5 seconds of it turning green, fail them
      goTimerRef.current = setTimeout(() => {
        setGameState('timeout');
        onAnswer("Missed it!", false, 5);
      }, 5000);
    }, randomDelay);
  };

  const handleClick = () => {
    if (isSubmitting || gameState === 'timeout') return;

    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'waiting') {
      // Clicked too early
      if (timerRef.current) clearTimeout(timerRef.current);
      setGameState('early');
      onAnswer("Too Early!", false, 0); // instantly fail
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

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Zap className="text-yellow-500" /> Reaction Speed Test
      </h2>
      
      <button
        onClick={handleClick}
        disabled={isSubmitting || gameState === 'early' || gameState === 'done' || gameState === 'timeout'}
        className={clsx(
          "w-full max-w-lg aspect-video rounded-3xl flex flex-col items-center justify-center text-3xl font-black text-white shadow-xl transition-transform active:scale-95",
          gameState === 'idle' && "bg-blue-500 hover:bg-blue-600 cursor-pointer",
          gameState === 'waiting' && "bg-red-500 cursor-pointer",
          gameState === 'go' && "bg-green-500 cursor-pointer",
          gameState === 'early' && "bg-gray-500 cursor-not-allowed",
          gameState === 'done' && "bg-green-600 cursor-not-allowed",
          gameState === 'timeout' && "bg-gray-800 cursor-not-allowed"
        )}
      >
        {gameState === 'idle' && (
          <div className="flex flex-col items-center gap-2">
            <span>CLICK TO START</span>
            <span className="text-base font-normal text-white/80 animate-pulse">Auto-fails in {timeLeft}s</span>
          </div>
        )}
        {gameState === 'waiting' && "WAIT FOR GREEN..."}
        {gameState === 'go' && "CLICK NOW!"}
        {gameState === 'early' && "TOO EARLY!"}
        {gameState === 'timeout' && "TOO SLOW!"}
        {gameState === 'done' && `${reactionTime} ms`}
      </button>

      <p className="mt-6 text-muted-foreground text-center px-4">
        {gameState === 'idle' && "When the red box turns green, click as fast as you can!"}
        {gameState === 'timeout' && "You took too long to react."}
      </p>
    </div>
  );
}
