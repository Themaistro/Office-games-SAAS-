import { GameProps } from "@/types/game";
import { useState } from "react";
import { clsx } from "clsx";

export default function TriviaGame({ question, onAnswer, isSubmitting }: GameProps) {
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
      <h2 className="text-2xl font-bold mb-2">Trivia Challenge</h2>
      
      <div className="w-full p-6 sm:p-10 rounded-xl mb-8 text-xl sm:text-2xl font-semibold text-center border border-border bg-card">
        {question.content.text}
      </div>
      
      <div className="flex flex-col gap-3 w-full max-w-lg">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(option)}
            disabled={isSubmitting}
            className={clsx(
              "font-semibold py-4 px-6 rounded-xl text-left transition-all border shadow-sm flex items-center",
              selectedOption === option 
                ? "bg-primary text-primary-foreground border-primary scale-[0.98]" 
                : "bg-card hover:bg-secondary/50 text-foreground border-border hover:border-primary/50"
            )}
          >
            <span className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">
              {String.fromCharCode(65 + idx)}
            </span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
