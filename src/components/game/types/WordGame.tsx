"use client";

import { GameProps } from "@/types/game";
import { useState } from "react";
import { clsx } from "clsx";

export default function WordGame({ question, onAnswer, isSubmitting }: GameProps) {
  const [startTime] = useState(Date.now());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (isSubmitting) return;
    setSelectedOption(option);
    const timeTaken = (Date.now() - startTime) / 1000;
    const isCorrect = option === question.correct_answer;
    
    setTimeout(() => {
      onAnswer(option, isCorrect, timeTaken);
    }, 400);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">Word Challenge</h2>
      <p className="text-muted-foreground mb-6">Unscramble the letters to find the word.</p>
      
      <div className="flex gap-2 mb-8 flex-wrap justify-center">
        {question.content.text.split('').map((letter: string, idx: number) => (
          <div key={idx} className="bg-card border-2 border-primary/20 w-12 h-16 sm:w-16 sm:h-20 rounded-lg flex items-center justify-center text-2xl sm:text-4xl font-bold shadow-sm uppercase">
            {letter}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(option)}
            disabled={isSubmitting}
            className={clsx(
              "font-bold py-5 rounded-xl text-xl transition-all border shadow-sm uppercase",
              selectedOption === option 
                ? "bg-primary text-primary-foreground border-primary scale-95" 
                : "bg-card hover:bg-secondary/80 text-foreground border-border hover:border-primary/50"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
