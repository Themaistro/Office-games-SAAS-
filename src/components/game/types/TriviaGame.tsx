"use client";

import { GameProps } from "@/types/game";
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { Clock, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TriviaGame({ question, onAnswer, isSubmitting, showHint }: GameProps & { showHint?: boolean }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [lifelineUsed, setLifelineUsed] = useState(false);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !selectedOption && !isSubmitting) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !selectedOption && !isSubmitting) {
      handleSelect(null, true);
    }
  }, [timeLeft, selectedOption, isSubmitting]);

  const useLifeline = useCallback(() => {
    if (lifelineUsed || selectedOption || isSubmitting) return;
    setLifelineUsed(true);
    
    // Find incorrect options
    const incorrect = question.options.filter(o => o !== question.correct_answer);
    const shuffled = [...incorrect].sort(() => 0.5 - Math.random());
    
    // A true 50/50 leaves exactly 1 incorrect option and the 1 correct option (2 options total)
    // So we eliminate all incorrect options EXCEPT one.
    const numToEliminate = Math.max(1, incorrect.length - 1);
    setEliminatedOptions(shuffled.slice(0, numToEliminate));
  }, [lifelineUsed, selectedOption, isSubmitting, question]);

  // Hook into global hint system
  useEffect(() => {
    if (showHint && !lifelineUsed) {
      useLifeline();
    }
  }, [showHint, lifelineUsed, useLifeline]);

  const handleSelect = (option: string | null, isTimeout = false) => {
    if (isSubmitting || selectedOption !== null) return;
    
    setSelectedOption(option || "[Timeout]");
    
    if (isTimeout) {
      // Immediate fail on timeout
      setRevealed(true);
      setTimeout(() => {
        onAnswer("[Timeout]", { customIsCorrect: false, customTimeSpent: 15 });
      }, 1000);
    } else {
      // Gameshow dramatic suspense
      setTimeout(() => {
        setRevealed(true);
        setTimeout(() => {
          const timeTaken = 15 - timeLeft;
          const isCorrect = option === question.correct_answer;
          // By passing it inside the custom object, we bypass the legacy signature
          onAnswer(option || "[Timeout]", { customIsCorrect: isCorrect, customTimeSpent: timeTaken });
        }, 1500);
      }, 1500); // 1.5 seconds of yellow pulse before the answer is revealed
    }
  };

  const getOptionState = (option: string) => {
    if (eliminatedOptions.includes(option)) return "eliminated";
    if (!selectedOption) return "idle";
    
    if (selectedOption === option) {
      if (!revealed) return "selected"; // dramatic pause (yellow pulse)
      return option === question.correct_answer ? "correct" : "incorrect";
    }
    
    if (revealed && option === question.correct_answer) {
      return "correct_revealed"; // show the correct answer if they got it wrong
    }
    
    return "idle_dimmed";
  };

  const getOptionClasses = (state: string) => {
    switch (state) {
      case "eliminated":
        return "opacity-20 pointer-events-none scale-95 grayscale border-border bg-card text-muted-foreground";
      case "selected":
        return "bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-400 animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.3)] z-10";
      case "correct":
        return "bg-green-500 text-white border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.5)] z-10";
      case "incorrect":
        return "bg-destructive text-destructive-foreground border-destructive z-10";
      case "correct_revealed":
        return "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400 animate-pulse";
      case "idle_dimmed":
        return "bg-card opacity-40 border-border pointer-events-none";
      default:
        return "bg-card hover:bg-secondary/80 text-foreground border-border hover:border-primary/50 hover:shadow-md";
    }
  };

  const questionText = question.content.text || question.content.question || "Unknown Question";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full flex flex-col items-center justify-center max-w-3xl mx-auto"
    >
      {/* Header / HUD */}
      <div className="w-full flex justify-between items-end mb-6 px-2">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> Trivia
          </h3>
        </motion.div>
        
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
            <Clock size={12} /> Time
          </span>
          <span className={clsx(
            "text-2xl font-mono font-bold transition-colors",
            timeLeft <= 5 ? "text-destructive animate-pulse" : "text-foreground"
          )}>
            {timeLeft}s
          </span>
        </motion.div>
      </div>
      
      {/* Question Card */}
      <motion.div 
        layout
        className={clsx(
          "w-full p-8 sm:p-12 rounded-3xl mb-8 text-2xl sm:text-3xl lg:text-4xl font-bold text-center border-2 bg-card shadow-xl transition-colors duration-500",
          selectedOption && !revealed && "border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.1)]",
          revealed && selectedOption === question.correct_answer && "border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)]",
          revealed && selectedOption !== question.correct_answer && "border-destructive/50 shadow-[0_0_40px_rgba(255,0,0,0.1)]"
        )}
      >
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
          {questionText}
        </span>
      </motion.div>
      
      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <AnimatePresence>
          {question.options.map((option, idx) => {
            const state = getOptionState(option);
            const classes = getOptionClasses(state);
            
            return (
              <motion.button
                key={option}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={state === "idle" ? { scale: 1.02 } : {}}
                whileTap={state === "idle" ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(option)}
                disabled={isSubmitting || selectedOption !== null || state === "eliminated"}
                className={clsx(
                  "relative font-semibold py-6 px-6 rounded-2xl text-lg sm:text-xl text-left transition-colors duration-300 border-2 flex items-center shadow-sm overflow-hidden",
                  classes
                )}
              >
                {/* Option Letter Badge */}
                <span className={clsx(
                  "mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors",
                  state === "idle" ? "bg-muted text-muted-foreground" : "bg-black/10 dark:bg-white/10"
                )}>
                  {String.fromCharCode(65 + idx)}
                </span>
                
                <span className="flex-1 drop-shadow-sm">{option}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
