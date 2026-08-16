"use client";

import { GameProps } from "@/types/game";
import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { Clock, Star, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CompanyTriviaGame({ question, onAnswer, isSubmitting, showHint }: GameProps & { showHint?: boolean }) {
  const [showIntro, setShowIntro] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [lifelineUsed, setLifelineUsed] = useState(false);

  useEffect(() => {
    setSelectedOption(null);
    setRevealed(false);
    setTimeLeft(15);
    setEliminatedOptions([]);
    setLifelineUsed(false);
    setShowIntro(true); // Reset intro for next question just in case
  }, [question]);

  // Intro Sequence
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Timer (only starts after intro)
  useEffect(() => {
    if (!showIntro && timeLeft > 0 && !selectedOption && !isSubmitting) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (!showIntro && timeLeft === 0 && !selectedOption && !isSubmitting) {
      handleSelect(null, true);
    }
  }, [showIntro, timeLeft, selectedOption, isSubmitting]);

  const useLifeline = useCallback(() => {
    if (showIntro || lifelineUsed || selectedOption || isSubmitting) return;
    setLifelineUsed(true);
    
    const uniqueOptions = Array.from(new Set(question.options));
    const incorrect = uniqueOptions.filter(o => o !== question.correct_answer);
    const shuffled = [...incorrect].sort(() => 0.5 - Math.random());
    
    const numToEliminate = Math.max(1, incorrect.length - 1);
    setEliminatedOptions(shuffled.slice(0, numToEliminate));
  }, [showIntro, lifelineUsed, selectedOption, isSubmitting, question]);

  // Hook into global hint system
  useEffect(() => {
    if (showHint && !lifelineUsed) {
      useLifeline();
    }
  }, [showHint, lifelineUsed, useLifeline]);

  const handleSelect = (option: string | null, isTimeout = false) => {
    if (showIntro || isSubmitting || selectedOption !== null) return;
    
    setSelectedOption(option || "[Timeout]");
    
    if (isTimeout) {
      setRevealed(true);
      setTimeout(() => {
        onAnswer("[Timeout]", { customIsCorrect: false, customTimeSpent: 15 });
      }, 1000);
    } else {
      setTimeout(() => {
        setRevealed(true);
        setTimeout(() => {
          const timeTaken = 15 - timeLeft;
          const isCorrect = option === question.correct_answer;
          onAnswer(option || "[Timeout]", { customIsCorrect: isCorrect, customTimeSpent: timeTaken });
        }, 1500);
      }, 1500);
    }
  };

  const getOptionState = (option: string) => {
    if (eliminatedOptions.includes(option)) return "eliminated";
    if (!selectedOption) return "idle";
    
    if (selectedOption === option) {
      if (!revealed) return "selected";
      return option === question.correct_answer ? "correct" : "incorrect";
    }
    
    if (revealed && option === question.correct_answer) {
      return "correct_revealed";
    }
    
    return "idle_dimmed";
  };

  const getOptionClasses = (state: string) => {
    switch (state) {
      case "eliminated":
        return "opacity-20 pointer-events-none scale-95 grayscale border-border bg-card text-muted-foreground";
      case "selected":
        return "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-400 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.3)] z-10";
      case "correct":
        return "bg-green-500 text-white border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.5)] z-10";
      case "incorrect":
        return "bg-destructive text-destructive-foreground border-destructive z-10";
      case "correct_revealed":
        return "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400 animate-pulse";
      case "idle_dimmed":
        return "bg-card opacity-40 border-border pointer-events-none";
      default:
        return "bg-card hover:bg-purple-900/10 dark:hover:bg-purple-500/20 text-foreground border-purple-500/30 hover:border-purple-500/80 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]";
    }
  };

  const questionText = question.content.text || question.content.question || "Unknown Question";

  if (showIntro) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.2 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full flex flex-col items-center justify-center max-w-3xl mx-auto min-h-[400px] space-y-6"
      >
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-8 bg-gradient-to-r from-purple-500 to-amber-500 opacity-20 blur-2xl rounded-full"
          />
          <div className="bg-gradient-to-br from-purple-500 to-amber-500 p-6 rounded-3xl shadow-2xl relative z-10">
            <Star className="w-20 h-20 text-white animate-pulse" fill="currentColor" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-amber-500 uppercase tracking-widest">
            Bonus Round
          </h2>
          <p className="text-xl md:text-2xl font-bold text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="text-amber-500" /> Company Trivia <Sparkles className="text-amber-500" />
          </p>
        </div>
      </motion.div>
    );
  }

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
          <h3 className="text-2xl font-bold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-amber-500 uppercase tracking-wider">
            <Star className="text-amber-500" fill="currentColor" /> Bonus Trivia
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
          "w-full p-8 sm:p-12 rounded-3xl mb-8 text-2xl sm:text-3xl lg:text-4xl font-bold text-center border-4 bg-card shadow-xl transition-colors duration-500",
          !selectedOption && "border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]",
          selectedOption && !revealed && "border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)]",
          revealed && selectedOption === question.correct_answer && "border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)]",
          revealed && selectedOption !== question.correct_answer && "border-destructive shadow-[0_0_40px_rgba(255,0,0,0.1)]"
        )}
      >
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-purple-500 to-amber-600">
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
                  "relative font-semibold py-6 px-6 rounded-2xl text-lg sm:text-xl text-left transition-all duration-300 border-2 flex items-center shadow-sm overflow-hidden",
                  classes
                )}
              >
                {/* Option Letter Badge */}
                <span className={clsx(
                  "mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors",
                  state === "idle" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-black/10 dark:bg-white/10"
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
