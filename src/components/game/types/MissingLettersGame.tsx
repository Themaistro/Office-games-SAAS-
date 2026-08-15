import React, { useState, useEffect, useMemo } from 'react';
import { GameComponentProps } from '@/types/game';

export default function MissingLettersGame({ question, onAnswer, isSubmitting, showHint }: GameComponentProps) {
  const wordWithBlanks = (question?.content?.wordWithBlanks || "") as string;
  const options = useMemo(() => question?.options || [], [question]);
  const correctAnswer = question?.correct_answer as string;

  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [shakingOption, setShakingOption] = useState<string | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(30);

  // Timer Logic
  useEffect(() => {
    if (isSubmitting) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitting]);

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting) {
      onAnswer("TIME_OUT", { customIsCorrect: false });
    }
  }, [timeLeft, isSubmitting, onAnswer]);

  // 50/50 Hint Logic
  useEffect(() => {
    if (showHint && eliminatedOptions.length === 0) {
      const wrongOptions = options.filter(opt => opt !== correctAnswer);
      const toEliminate = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 2);
      setEliminatedOptions(toEliminate);
    }
  }, [showHint, options, correctAnswer, eliminatedOptions.length]);

  const handleOptionClick = (option: string) => {
    if (isSubmitting || eliminatedOptions.includes(option)) return;

    if (option === correctAnswer) {
      onAnswer(option, { customIsCorrect: true, isPerfect: true });
    } else {
      setShakingOption(option);
      setRevealedAnswer(true);
      setTimeout(() => {
        onAnswer(option, { customIsCorrect: false });
      }, 1200);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl w-full max-w-lg mx-auto text-center transition-all duration-500">
      <div className="flex justify-between items-center w-full mb-6">
        <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wider">
          MISSING LETTERS
        </div>
        <div className={`font-mono text-xl font-bold ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </div>
      
      <p className="text-muted-foreground mb-8 text-sm">Which letters complete the word?</p>

      {/* Word with Blanks Display */}
      <div className="flex gap-1.5 sm:gap-2 mb-10 flex-wrap justify-center max-w-full px-2">
        {wordWithBlanks.split('').map((letter, index) => (
          <div 
            key={index} 
            className={`
              w-10 h-12 sm:w-14 sm:h-16 flex items-center justify-center text-2xl sm:text-3xl rounded-lg font-black
              ${letter === '_' 
                ? 'bg-secondary/50 border-b-4 border-primary/40 text-transparent shadow-inner' 
                : 'bg-gradient-to-b from-card to-secondary/80 border-2 border-primary/20 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] text-foreground cursor-default'}
            `}
          >
            {letter}
          </div>
        ))}
      </div>

      {showHint && eliminatedOptions.length > 0 && (
        <div className="mb-6 text-orange-500 font-bold bg-orange-500/10 px-4 py-2 rounded-lg animate-pulse w-full max-w-xs mx-auto text-sm">
          Hint: 50/50 Activated!
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        {options.map((option, index) => {
          const isEliminated = eliminatedOptions.includes(option);
          const isShaking = shakingOption === option;

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(option)}
              disabled={isSubmitting || isEliminated}
              className={`
                relative w-full py-4 px-6 rounded-xl font-bold text-xl sm:text-2xl tracking-widest transition-all duration-200 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] active:shadow-none active:translate-y-1
                ${isEliminated 
                  ? 'opacity-30 scale-95 bg-secondary/50 text-muted-foreground cursor-not-allowed border-transparent shadow-none translate-y-1' 
                  : 'bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary hover:border-primary hover:shadow-[0_4px_0_0_rgba(0,0,0,0.1)]'}
                ${isShaking ? 'animate-[shake_0.5s_ease-in-out] !bg-destructive/10 !border-destructive !text-destructive' : ''}
                ${revealedAnswer && option === correctAnswer ? '!bg-green-500/20 !border-green-500 !text-green-600 scale-105' : ''}
              `}
            >
              {option.toUpperCase()}
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
