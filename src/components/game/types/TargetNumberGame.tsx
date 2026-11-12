"use client";

import { useChallengeClock } from "@/hooks/useChallengeClock";

import type { GameComponentPropsFor } from "@/types/game";
import { useEffect, useMemo, useState } from "react";

export default function TargetNumberGame({
  question,
  onAnswer,
  isSubmitting,
  showHint,
}: GameComponentPropsFor<"math">) {
  const targetNumber = question?.content?.target || 0;
  const options = useMemo(
    () => Array.from(new Set((question?.options || []) as string[])),
    [question],
  );
  const correctAnswer = question?.correct_answer as string;

  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [shakingOption, setShakingOption] = useState<string | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState(false);

  const timeLeft = useChallengeClock(30, !isSubmitting);

  useEffect(() => {
    setEliminatedOptions([]);
    setShakingOption(null);
    setRevealedAnswer(false);
  }, [question.id]);

  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting)
      onAnswer("TIME_OUT", { customIsCorrect: false });
  }, [timeLeft, isSubmitting, onAnswer]);

  // 50/50 Hint Logic
  useEffect(() => {
    if (showHint && eliminatedOptions.length === 0) {
      const wrongOptions = question.hint_options || [];
      const toEliminate = wrongOptions
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      setEliminatedOptions(toEliminate);
    }
  }, [showHint, options, correctAnswer, eliminatedOptions.length]);

  const handleOptionClick = (option: string) => {
    if (isSubmitting || eliminatedOptions.includes(option)) return;
    onAnswer(option);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-xl w-full max-w-lg mx-auto text-center transition-all duration-500">
      <div className="flex justify-between items-center w-full mb-6">
        <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wider">
          TARGET NUMBER
        </div>
        <div
          className={`font-mono text-xl font-bold ${timeLeft <= 5 ? "text-destructive animate-pulse" : "text-primary"}`}
        >
          00:{timeLeft.toString().padStart(2, "0")}
        </div>
      </div>

      <p className="text-muted-foreground mb-4 text-sm">
        Which equation equals the target number?
      </p>

      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-primary/20 flex flex-col items-center justify-center mb-8 shadow-inner bg-gradient-to-br from-background to-secondary/50">
        <span className="text-4xl sm:text-6xl font-black text-foreground drop-shadow-sm">
          {targetNumber}
        </span>
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
                ${
                  isEliminated
                    ? "opacity-30 scale-95 bg-secondary/50 text-muted-foreground cursor-not-allowed border-transparent"
                    : "bg-card hover:bg-primary/5 border-2 border-border hover:border-primary/50 text-foreground hover:shadow-md hover:-translate-y-1 active:scale-95"
                }
                ${isShaking ? "animate-[shake_0.5s_ease-in-out] !bg-destructive/10 !border-destructive !text-destructive" : ""}
                ${revealedAnswer && option === correctAnswer ? "!bg-green-500/20 !border-green-500 !text-green-600 scale-105" : ""}
              `}
            >
              {option}
            </button>
          );
        })}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
      `,
        }}
      />
    </div>
  );
}
