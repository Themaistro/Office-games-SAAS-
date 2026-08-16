"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { GameComponentProps } from '@/types/game';

export default function UnscrambleGame({ question, onAnswer, isSubmitting, showHint }: GameComponentProps) {
  const scrambledWord = (question?.content?.scrambled || "") as string;
  const options = useMemo(() => question?.options || [], [question]);
  const correctAnswer = question?.correct_answer as string;

  const [mistakes, setMistakes] = useState(0);
  const [shakingOption, setShakingOption] = useState<string | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);

  // 50/50 Hint Logic
  useEffect(() => {
    if (showHint && eliminatedOptions.length === 0) {
      const wrongOptions = options.filter(opt => opt !== correctAnswer);
      // Pick 2 wrong options to eliminate (since there are 4 options total, 3 wrong ones)
      const toEliminate = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
      setEliminatedOptions(toEliminate);
    }
  }, [showHint, options, correctAnswer, eliminatedOptions.length]);

  const handleOptionClick = (option: string) => {
    if (isSubmitting || eliminatedOptions.includes(option)) return;

    if (option === correctAnswer) {
      const isPerfect = mistakes === 0;
      onAnswer(option, { customIsCorrect: true, isPerfect });
    } else {
      setMistakes(m => m + 1);
      setShakingOption(option);
      setTimeout(() => setShakingOption(null), 500);
      
      // Optionally eliminate the wrong answer they just clicked
      if (!eliminatedOptions.includes(option)) {
        setEliminatedOptions(prev => [...prev, option]);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl w-full max-w-lg mx-auto text-center transition-all duration-500">
      {scrambledWord === "" && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded text-left overflow-auto w-full text-xs max-h-40 mb-4">
          <p className="font-bold">DEBUG: Missing scrambledWord</p>
          <pre>{JSON.stringify(question, null, 2)}</pre>
        </div>
      )}
      <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6">
        WORD UNSCRAMBLE
      </div>
      
      <p className="text-muted-foreground mb-8 text-sm">Select the word that matches the scrambled letters below.</p>

      {/* Scrambled Word Display */}
      <div className="flex gap-1.5 sm:gap-2 mb-10 flex-wrap justify-center max-w-full px-2">
        {scrambledWord.split('').map((letter, index) => (
          <div 
            key={index} 
            className="w-10 h-12 sm:w-14 sm:h-16 flex items-center justify-center bg-gradient-to-b from-card to-secondary/80 border-2 border-primary/20 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] text-foreground font-black text-2xl sm:text-3xl rounded-lg transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_rgba(0,0,0,0.15)] transition-all cursor-default"
          >
            {letter}
          </div>
        ))}
      </div>

      {showHint && eliminatedOptions.length > 0 && (
        <div className="mb-6 text-orange-500 font-bold bg-orange-500/10 px-4 py-2 rounded-lg animate-pulse w-full max-w-xs mx-auto text-sm">
          Hint: 50/50 Activated! Two incorrect options removed.
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        {options.map((option, index) => {
          const isEliminated = eliminatedOptions.includes(option);
          const isShaking = shakingOption === option;
          const displayOption = option.charAt(0).toUpperCase() + option.slice(1).toLowerCase();

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={isSubmitting || isEliminated}
              className={`
                relative w-full py-4 px-6 rounded-xl font-bold text-lg sm:text-xl transition-all duration-200 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-1
                ${isEliminated 
                  ? 'opacity-30 scale-95 bg-secondary/50 text-muted-foreground cursor-not-allowed border-transparent shadow-none translate-y-1' 
                  : 'bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary hover:border-primary hover:shadow-[0_4px_0_0_rgba(0,0,0,0.1)]'}
                ${isShaking ? 'animate-[shake_0.5s_ease-in-out] bg-destructive/10 border-destructive text-destructive shadow-[0_4px_0_0_rgba(255,0,0,0.1)]' : ''}
              `}
            >
              {displayOption}
            </button>
          );
        })}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
      `}} />
    </div>
  );
}
