import { GameProps } from "@/types/game";
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { Clock, BrainCircuit } from "lucide-react";

export default function LogicGame({ question, onAnswer, isSubmitting, showHint }: GameProps & { showHint?: boolean }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [hintUsed, setHintUsed] = useState(false);

  const useHint = useCallback(() => {
    if (hintUsed || selectedOption || isSubmitting) return;
    setHintUsed(true);
    // Logic hint: Eliminate 1 incorrect option
    const incorrect = question.options.filter(o => o !== question.correct_answer);
    if (incorrect.length > 0) {
      const shuffled = [...incorrect].sort(() => 0.5 - Math.random());
      setEliminatedOptions([shuffled[0]]);
    }
  }, [hintUsed, selectedOption, isSubmitting, question]);

  useEffect(() => {
    if (showHint && !hintUsed) {
      useHint();
    }
  }, [showHint, hintUsed, useHint]);

  useEffect(() => {
    if (timeLeft > 0 && !selectedOption && !isSubmitting) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !selectedOption && !isSubmitting) {
      handleSelect(null, true);
    }
  }, [timeLeft, selectedOption, isSubmitting]);

  const handleSelect = (option: string | null, isTimeout = false) => {
    if (isSubmitting || selectedOption !== null) return;
    
    setSelectedOption(option || "[Timeout]");
    
    if (isTimeout) {
      setRevealed(true);
      setTimeout(() => {
        onAnswer("[Timeout]", { customIsCorrect: false, customTimeSpent: 30 });
      }, 1000);
    } else {
      setTimeout(() => {
        setRevealed(true);
        setTimeout(() => {
          const timeTaken = 30 - timeLeft;
          const isCorrect = option === question.correct_answer;
          onAnswer(option || "[Timeout]", { customIsCorrect: isCorrect, customTimeSpent: timeTaken });
        }, 1500);
      }, 1000); // 1s dramatic pause before reveal
    }
  };

  const questionText = question.content.text || question.content.question || "";
  
  // Try to parse as a sequence if it looks like one (comma/arrow/space separated with a ?)
  const isSequence = questionText.includes('?') && questionText.length < 50;
  // If it's a sequence, split by common delimiters but keep the items
  const sequenceItems = isSequence 
    ? questionText.split(/[,→\s]+/).filter(b => b.trim().length > 0)
    : [questionText];

  const getOptionClasses = (option: string) => {
    if (eliminatedOptions.includes(option)) {
      return "opacity-20 pointer-events-none scale-95 grayscale border-border bg-card text-muted-foreground";
    }

    if (!selectedOption) {
       return "bg-card hover:bg-secondary/80 text-foreground border-border hover:border-primary/50 hover:scale-[1.02] hover:shadow-md";
    }
    if (selectedOption === option) {
      if (!revealed) return "bg-primary/20 border-primary text-primary animate-pulse scale-[1.02] shadow-lg shadow-primary/30 z-10";
      return option === question.correct_answer 
        ? "bg-green-500 text-white border-green-600 scale-[1.05] shadow-xl shadow-green-500/50 z-20"
        : "bg-destructive text-destructive-foreground border-destructive scale-[0.98] z-10";
    }
    
    if (revealed && option === question.correct_answer) {
      return "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400 animate-pulse";
    }
    
    return "bg-card opacity-40 border-border pointer-events-none scale-95";
  };

  return (
    <div className="w-full flex flex-col items-center justify-center max-w-4xl mx-auto px-2">
      {/* Header */}
      <div className="w-full flex justify-between items-end mb-8 px-2">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-primary" /> Logic Challenge
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
            <Clock size={12} /> Time
          </span>
          <span className={clsx(
            "text-2xl font-mono font-bold transition-colors",
            timeLeft <= 10 ? "text-destructive animate-pulse" : "text-foreground"
          )}>
            {timeLeft}s
          </span>
        </div>
      </div>
      
      {/* Sequence Display */}
      <div className={clsx(
        "w-full bg-card border-2 shadow-xl rounded-3xl p-8 sm:p-12 mb-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[240px] transition-all duration-500 relative overflow-hidden",
        !selectedOption && "border-border/50",
        selectedOption && !revealed && "border-primary/50 shadow-2xl shadow-primary/10",
        revealed && selectedOption === question.correct_answer && "border-green-500 shadow-2xl shadow-green-500/20 bg-green-500/5",
        revealed && selectedOption !== question.correct_answer && "border-destructive/50 shadow-2xl shadow-destructive/10 bg-destructive/5"
      )}>
        {/* Ambient background glow */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 via-transparent to-transparent pointer-events-none" />

        {isSequence ? (
          sequenceItems.map((item, idx) => {
            const isPlaceholder = item.includes('?');
            let displayItem = item;
            
            // If this is the ?, dynamically replace it with the selected option
            if (isPlaceholder && selectedOption) {
              displayItem = selectedOption;
            }

            return (
              <div 
                key={idx}
                className={clsx(
                  "flex items-center justify-center min-w-[72px] h-[72px] sm:min-w-[96px] sm:h-[96px] px-4 rounded-2xl text-3xl sm:text-5xl font-black font-mono shadow-sm transition-all duration-500 border-2 z-10",
                  !isPlaceholder && "bg-secondary border-border/50 text-foreground drop-shadow-sm",
                  isPlaceholder && !selectedOption && "bg-primary/10 border-primary/30 text-primary animate-pulse border-dashed drop-shadow-sm",
                  isPlaceholder && selectedOption && !revealed && "bg-primary text-primary-foreground border-primary scale-110 shadow-lg shadow-primary/50",
                  isPlaceholder && revealed && selectedOption === question.correct_answer && "bg-green-500 border-green-500 text-white scale-110 shadow-xl shadow-green-500/50",
                  isPlaceholder && revealed && selectedOption !== question.correct_answer && "bg-destructive border-destructive text-white scale-95 shadow-inner"
                )}
              >
                {displayItem}
              </div>
            );
          })
        ) : (
          <div className="text-2xl sm:text-3xl font-bold text-center z-10 leading-relaxed max-w-2xl">
            {questionText}
          </div>
        )}
      </div>
      
      {/* Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(option)}
            disabled={isSubmitting || selectedOption !== null || eliminatedOptions.includes(option)}
            className={clsx(
              "font-bold py-6 sm:py-8 rounded-2xl text-xl sm:text-2xl transition-all duration-300 border-2 shadow-sm relative overflow-hidden flex items-center justify-center",
              getOptionClasses(option)
            )}
          >
            <span className="drop-shadow-sm z-10">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
