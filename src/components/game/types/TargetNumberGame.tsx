import React, { useState, useEffect, useMemo } from 'react';
import { GameComponentProps } from '@/types/game';

export default function TargetNumberGame({ question, onAnswer, isSubmitting, showHint }: GameComponentProps) {
  const targetNumber = question?.content?.target || 0;
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
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onAnswer("TIME_OUT", { customIsCorrect: false });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitting, onAnswer]);

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
          TARGET NUMBER
        </div>
        <div className={`font-mono text-xl font-bold ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-primary'}`}>
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      </div>
      
      <p className="text-muted-foreground mb-4 text-sm">Which equation equals the target number?</p>

      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-primary/20 flex flex-col items-center justify-center mb-8 shadow-inner bg-gradient-to-br from-background to-secondary/50">
        <span className="text-4xl sm:text-6xl font-black text-foreground drop-shadow-sm">{targetNumber}</span>
      </div>

      {showHint && eliminatedOptions.length > 0 && (
        <div className="mb-6 text-orange-500 font-bold bg-orange-500/10 px-4 py-2 rounded-lg animate-pulse w-full max-w-xs mx-auto text-sm">
          Hint: 50/50 Activated!
        </div>
      )}

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
                relative w-full py-4 px-6 rounded-2xl font-bold text-lg sm:text-xl transition-all duration-300
                ${isEliminated 
                  ? 'opacity-30 scale-95 bg-secondary/50 text-muted-foreground cursor-not-allowed border-transparent' 
                  : 'bg-card hover:bg-primary/5 border-2 border-border hover:border-primary/50 text-foreground hover:shadow-md hover:-translate-y-1 active:scale-95'}
                ${isShaking ? 'animate-[shake_0.5s_ease-in-out] !bg-destructive/10 !border-destructive !text-destructive' : ''}
                ${revealedAnswer && option === correctAnswer ? '!bg-green-500/20 !border-green-500 !text-green-600 scale-105' : ''}
              `}
            >
              {option}
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
