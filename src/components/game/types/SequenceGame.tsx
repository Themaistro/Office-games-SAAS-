"use client";

import { GameProps } from "@/types/game";
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { Grid3x3, Clock, Sparkles } from "lucide-react";

export default function SequenceGame({ question, onAnswer, isSubmitting, showHint }: GameProps & { showHint?: boolean }) {
  const [gameState, setGameState] = useState<'memorize' | 'play'>('memorize');
  const [mode, setMode] = useState<'numbers' | 'letters'>('numbers');
  
  // Scale difficulty
  const difficulty = question?.difficulty || 'medium';
  let gridSize = 9; // 3x3 for easy
  let seqLength = 4;
  
  if (difficulty === 'medium') {
    gridSize = 16; // 4x4
    seqLength = 6;
  } else if (difficulty === 'hard') {
    gridSize = 25; // 5x5
    seqLength = 8;
  }
  
  const GRID_SIZE = gridSize;
  const SEQUENCE_LENGTH = seqLength;
  
  const [timeLeft, setTimeLeft] = useState(5);
  const [playTimeLeft, setPlayTimeLeft] = useState(15);
  const [startTime, setStartTime] = useState(Date.now());
  const [grid, setGrid] = useState<(number | null)[]>(Array(GRID_SIZE).fill(null));
  const [currentStep, setCurrentStep] = useState(1);
  const [failed, setFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  
  useEffect(() => {
    // Randomize mode
    setMode(Math.random() > 0.5 ? 'letters' : 'numbers');

    // Distribute numbers 1 to SEQUENCE_LENGTH randomly in the grid
    const newGrid = Array(GRID_SIZE).fill(null);
    let placed = 0;
    while (placed < SEQUENCE_LENGTH) {
      const randomPos = Math.floor(Math.random() * GRID_SIZE);
      if (newGrid[randomPos] === null) {
        newGrid[randomPos] = placed + 1;
        placed++;
      }
    }
    setGrid(newGrid);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('play');
          setStartTime(Date.now()); // Start timing the actual gameplay
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const useHint = useCallback(() => {
    if (hintUsed || isSubmitting || failed || gameState === 'memorize') return;
    setHintUsed(true);
    
    // Hint: Reveal all numbers for 1.5 seconds!
    setIsPeeking(true);
    setTimeout(() => {
      setIsPeeking(false);
    }, 1500);
  }, [hintUsed, isSubmitting, failed, gameState]);

  useEffect(() => {
    if (showHint && !hintUsed) {
      useHint();
    }
  }, [showHint, hintUsed, useHint]);

  useEffect(() => {
    let playTimer: NodeJS.Timeout;
    if (gameState === 'play' && !failed && !isSubmitting && currentStep <= SEQUENCE_LENGTH && playTimeLeft > 0 && !isPeeking) {
      playTimer = setInterval(() => {
        setPlayTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (playTimer) clearInterval(playTimer);
    };
  }, [gameState, failed, isSubmitting, currentStep, playTimeLeft, isPeeking]);

  useEffect(() => {
    if (playTimeLeft === 0 && gameState === 'play' && !failed && !isSubmitting) {
      setFailed(true);
      onAnswer("Time's up!", false, 15);
    }
  }, [playTimeLeft, gameState, failed, isSubmitting, onAnswer]);

  const handleTileClick = (index: number) => {
    if (isSubmitting || failed || gameState === 'memorize' || isPeeking || grid[index] === null) return;
    
    const clickedNumber = grid[index];
    
    if (clickedNumber === currentStep) {
      // Correct!
      const newGrid = [...grid];
      newGrid[index] = null; // Remove it so it disappears completely
      setGrid(newGrid);
      
      if (currentStep === SEQUENCE_LENGTH) {
        // Won!
        const timeTaken = (Date.now() - startTime) / 1000;
        onAnswer("Completed Sequence", true, timeTaken);
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Wrong!
      setFailed(true);
      const timeTaken = (Date.now() - startTime) / 1000;
      onAnswer("Failed Sequence", false, timeTaken);
    }
  };

  const getDisplayValue = (num: number) => {
    if (mode === 'letters') {
      return String.fromCharCode(64 + num); // 1 = A, 2 = B, etc.
    }
    return num;
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full z-0 overflow-hidden rounded-3xl p-4 sm:p-8">
      {/* Background glowing orbs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -z-10 animate-pulse duration-1000 delay-500" />

      <h2 className="text-2xl font-black mb-2 flex items-center gap-2 tracking-tight">
        <Sparkles className="text-purple-400" /> Chimp Sequence
      </h2>
      
      <p className="text-muted-foreground mb-8 text-center px-4 h-16 max-w-sm flex flex-col items-center justify-center">
        {gameState === 'memorize' ? (
          <>
            <span>Memorize the {mode} from <strong className="text-foreground">{getDisplayValue(1)} to {getDisplayValue(SEQUENCE_LENGTH)}</strong>.</span>
            <span className="flex items-center gap-1 mt-2 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">
               Hiding in {timeLeft}s
            </span>
          </>
        ) : (
          <>
            <span>Click the hidden tiles in order from <strong className="text-foreground">{getDisplayValue(1)} to {getDisplayValue(SEQUENCE_LENGTH)}</strong>.</span>
            <span className="flex items-center gap-1 mt-2 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full">
              <Clock size={16} className={playTimeLeft <= 5 ? "text-destructive animate-pulse" : ""} /> 
              <span className={playTimeLeft <= 5 ? "text-destructive animate-pulse" : ""}>{playTimeLeft}s</span>
            </span>
          </>
        )}
      </p>
      
      <div 
        className="grid gap-3 sm:gap-4 p-4 sm:p-6 bg-card/50 backdrop-blur-xl border border-border shadow-2xl rounded-3xl mx-auto w-full max-w-sm aspect-square relative"
        style={{ gridTemplateColumns: `repeat(${Math.sqrt(GRID_SIZE)}, minmax(0, 1fr))` }}
      >
        {grid.map((num, i) => {
          // Hide as soon as we enter play state
          const isHidden = gameState === 'play' && num !== null && !isPeeking && !failed;
          const isEmpty = num === null;
          
          return (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              disabled={isSubmitting || failed || gameState === 'memorize' || isEmpty || isPeeking}
              className={clsx(
                "aspect-square rounded-2xl text-2xl sm:text-4xl font-black flex items-center justify-center transition-all duration-300",
                isEmpty 
                  ? "opacity-0 scale-90 pointer-events-none" // Completely hide popped tiles
                  : "bg-white/10 dark:bg-black/20 border border-border shadow-lg hover:bg-white/20 dark:hover:bg-black/30 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md",
                
                // When hidden, just hide the text, keep the button looking normal
                isHidden && !isEmpty && "text-transparent",
                
                // Normal state text color
                !isHidden && !isEmpty && "text-foreground",
                
                // Failure highlights
                failed && !isEmpty && num !== currentStep && "border-destructive bg-destructive/20 text-destructive scale-95 opacity-50",
                failed && !isEmpty && num === currentStep && "border-green-500 bg-green-500/20 text-green-500 scale-110 shadow-green-500/30 animate-pulse z-10"
              )}
              style={{ animationDelay: `${i * 20}ms` }}
            >
              {/* Show number if it's memorize state, peeking, step 1, or failed */}
              {(!isHidden || failed || isPeeking) && num !== null && getDisplayValue(num)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
