"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { GameProps } from '@/types/game';
import { Target, Clock, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export default function OddObjectGame({ question, onAnswer, isSubmitting, showHint }: GameProps) {
  const [grid, setGrid] = useState<{ id: number, isOdd: boolean, emoji: string, isEliminated: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(15);
  const [startTime, setStartTime] = useState(Date.now());
  const [failed, setFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  const difficulty = question?.difficulty || 'medium';
  const cols = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 9;
  const gridSize = cols * cols;
  const emojiSize = cols >= 9 ? 'text-xl sm:text-3xl' : cols >= 7 ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-5xl';

  useEffect(() => {
    let baseEmoji = question?.content?.even || "🍎";
    let oddEmoji = question?.content?.odd || "🍅";

    const oddIndex = Math.floor(Math.random() * gridSize);
    
    const newGrid = Array.from({ length: gridSize }).map((_, i) => {
      const isOdd = i === oddIndex;
      return { 
        id: i, 
        isOdd, 
        emoji: isOdd ? oddEmoji : baseEmoji,
        isEliminated: false
      };
    });
    
    setGrid(newGrid);
    setStartTime(Date.now());
    setTimeLeft(15);
    setFailed(false);
    setHintUsed(false);
  }, [question, gridSize]);

  const useHint = useCallback(() => {
    if (hintUsed || isSubmitting || failed || grid.length === 0) return;
    setHintUsed(true);
    
    // Eliminate about half of the incorrect emojis to make it much easier
    setGrid(prev => {
      const incorrectIdxs = prev.map((item, i) => !item.isOdd && !item.isEliminated ? i : -1).filter(i => i !== -1);
      // Shuffle and take half
      const toEliminate = incorrectIdxs.sort(() => 0.5 - Math.random()).slice(0, Math.floor(incorrectIdxs.length / 2));
      
      return prev.map((item, i) => 
        toEliminate.includes(i) ? { ...item, isEliminated: true } : item
      );
    });
  }, [hintUsed, isSubmitting, failed, grid.length]);

  useEffect(() => {
    if (showHint && !hintUsed) {
      useHint();
    }
  }, [showHint, hintUsed, useHint]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!failed && !isSubmitting && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [failed, isSubmitting, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !failed && !isSubmitting) {
      setFailed(true);
      onAnswer("Time's up!", false, 15);
    }
  }, [timeLeft, failed, isSubmitting, onAnswer]);

  const handleSelect = (isOdd: boolean) => {
    if (isSubmitting || failed) return;
    
    if (isOdd) {
      const timeTaken = (Date.now() - startTime) / 1000;
      const isPerfect = timeTaken < 3; // Perfect if found under 3 seconds
      onAnswer("Found It!", { customIsCorrect: true, isPerfect }, timeTaken);
    } else {
      setFailed(true);
      const timeTaken = (Date.now() - startTime) / 1000;
      onAnswer("Wrong Object", false, timeTaken);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full z-0 overflow-hidden rounded-3xl p-4 sm:p-8">
      {/* Background glowing orbs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] -z-10 animate-pulse duration-1000 delay-500" />

      <h2 className="text-2xl font-black mb-2 flex items-center gap-2 tracking-tight">
        <Sparkles className="text-yellow-500" /> Spot the Imposter
      </h2>
      <p className="text-muted-foreground mb-6 text-center px-4 max-w-sm">
        Find the <span className="font-bold text-foreground">one emoji</span> that doesn't match the rest.<br/>
        <span className="flex items-center justify-center gap-1 mt-3 text-primary font-bold bg-primary/10 w-max mx-auto px-3 py-1 rounded-full">
          <Clock size={16} className={timeLeft <= 5 ? "text-destructive animate-pulse" : ""} /> 
          <span className={timeLeft <= 5 ? "text-destructive animate-pulse" : ""}>{timeLeft}s</span>
        </span>
      </p>

      <div className="grid gap-2 sm:gap-3 p-3 sm:p-5 bg-card/50 backdrop-blur-xl border border-border shadow-2xl rounded-3xl max-w-xl mx-auto w-full aspect-square"
           style={{ 
             gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
           }}>
        {grid.map((item) => (
          <button
            key={item.id}
            disabled={isSubmitting || failed || item.isEliminated}
            onClick={() => handleSelect(item.isOdd)}
            className={clsx(
              "rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer select-none",
              emojiSize,
              !failed && !item.isEliminated && "hover:bg-black/5 dark:hover:bg-white/5 hover:scale-110 hover:shadow-lg active:scale-95",
              failed && item.isOdd && "bg-green-500/20 border-2 border-green-500 scale-110 shadow-green-500/20 shadow-xl z-20 animate-bounce",
              failed && !item.isOdd && "opacity-30 scale-90 grayscale",
              item.isEliminated && !failed && "opacity-10 scale-75 pointer-events-none grayscale"
            )}
          >
            <span className={clsx("drop-shadow-sm transition-all duration-300", item.isEliminated && "blur-sm")}>
              {item.emoji}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
