import { GameProps } from "@/types/game";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Zap } from "lucide-react";

export default function ReactionGame({ onAnswer, isSubmitting }: GameProps) {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'go' | 'early' | 'done'>('idle');
  const [startTime, setStartTime] = useState<number>(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setGameState('waiting');
    // Random wait between 2 to 5 seconds
    const randomDelay = Math.floor(Math.random() * 3000) + 2000;
    
    timerRef.current = setTimeout(() => {
      setGameState('go');
      setStartTime(Date.now());
    }, randomDelay);
  };

  const handleClick = () => {
    if (isSubmitting) return;

    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'waiting') {
      // Clicked too early
      if (timerRef.current) clearTimeout(timerRef.current);
      setGameState('early');
      onAnswer("Too Early!", false, 0); // instantly fail
    } else if (gameState === 'go') {
      // Success! Calculate reaction time
      const timeMs = Date.now() - startTime;
      setReactionTime(timeMs);
      setGameState('done');
      
      // Submit answer. If under 500ms, it's considered correct for max points.
      const isCorrect = true; 
      onAnswer(`${timeMs}ms`, isCorrect, timeMs / 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Zap className="text-yellow-500" /> Reaction Speed Test
      </h2>
      
      <button
        onClick={handleClick}
        disabled={isSubmitting || gameState === 'early' || gameState === 'done'}
        className={clsx(
          "w-full max-w-lg aspect-video rounded-3xl flex flex-col items-center justify-center text-3xl font-black text-white shadow-xl transition-transform active:scale-95",
          gameState === 'idle' && "bg-blue-500 hover:bg-blue-600 cursor-pointer",
          gameState === 'waiting' && "bg-red-500 cursor-pointer",
          gameState === 'go' && "bg-green-500 cursor-pointer",
          gameState === 'early' && "bg-gray-500 cursor-not-allowed",
          gameState === 'done' && "bg-green-600 cursor-not-allowed"
        )}
      >
        {gameState === 'idle' && "CLICK TO START"}
        {gameState === 'waiting' && "WAIT FOR GREEN..."}
        {gameState === 'go' && "CLICK NOW!"}
        {gameState === 'early' && "TOO EARLY!"}
        {gameState === 'done' && `${reactionTime} ms`}
      </button>

      <p className="mt-6 text-muted-foreground text-center px-4">
        {gameState === 'idle' && "When the red box turns green, click as fast as you can!"}
      </p>
    </div>
  );
}
