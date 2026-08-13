import { GameProps } from "@/types/game";
import { useState, useEffect } from "react";
import { clsx } from "clsx";

export default function LogicGame({ question, onAnswer, isSubmitting }: GameProps) {
  const [startTime] = useState(Date.now());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (isSubmitting) return;
    setSelectedOption(option);
    const timeTaken = (Date.now() - startTime) / 1000;
    const isCorrect = option === question.correct_answer;
    
    // Slight delay so they can see what they clicked before it moves on
    setTimeout(() => {
      onAnswer(option, isCorrect, timeTaken);
    }, 400);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">Logic Challenge</h2>
      <p className="text-muted-foreground mb-6">Find the missing element in the sequence.</p>
      
      <div className="bg-muted p-8 rounded-xl mb-8 text-2xl sm:text-3xl font-mono tracking-widest font-bold w-full text-center shadow-inner">
        {question.content.text}
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(option)}
            disabled={isSubmitting}
            className={clsx(
              "font-bold py-5 rounded-xl text-xl transition-all border shadow-sm",
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
