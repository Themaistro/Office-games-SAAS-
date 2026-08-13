import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameComponentProps } from '@/types/game';
import { Activity, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export default function MentalMathGame({ onAnswer, isSubmitting, showHint }: GameComponentProps) {
  const [equation, setEquation] = useState("");
  const [answer, setAnswer] = useState(0);
  const [input, setInput] = useState("");
  
  const [timeLeft, setTimeLeft] = useState(15);
  const [shake, setShake] = useState(false);
  const [solved, setSolved] = useState(false); // To freeze timer when correct

  const inputRef = useRef<HTMLInputElement>(null);

  // Generate Equation
  useEffect(() => {
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    let a, b, res;
    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 50) + 10;
      res = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * 20) + 1;
      res = a - b;
    } else {
      a = Math.floor(Math.random() * 10) + 2;
      b = Math.floor(Math.random() * 10) + 2;
      res = a * b;
    }

    setEquation(`${a} ${op} ${b}`);
    setAnswer(res);
    
    // Auto-focus input on mount
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleWrong = useCallback(() => {
    if (isSubmitting || solved) return;
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setTimeout(() => {
       onAnswer(input || "[Timeout]", { customIsCorrect: false, isPerfect: false }, 15 - timeLeft);
    }, 500); // short shake then submit
  }, [input, isSubmitting, solved, timeLeft, onAnswer]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitting && !solved) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isSubmitting && !solved) {
      handleWrong();
    }
  }, [timeLeft, isSubmitting, solved, handleWrong]);

  // Auto-submit check
  useEffect(() => {
    if (input && parseInt(input, 10) === answer && !isSubmitting && !solved) {
       setSolved(true);
       setTimeout(() => {
         onAnswer(input, { customIsCorrect: true, isPerfect: true }, 15 - timeLeft);
       }, 500); // Tiny delay so they can see the input before it submits
    }
  }, [input, answer, isSubmitting, solved, timeLeft, onAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input && parseInt(input, 10) !== answer) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col items-center max-w-md mx-auto w-full px-4"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div className="flex justify-between items-end w-full mb-6">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> Mental Math
          </h3>
        </motion.div>
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col items-end">
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

      {showHint && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-4 text-orange-500 font-bold bg-orange-500/10 px-4 py-2 rounded-lg animate-pulse w-full text-center"
        >
          Hint: The answer is between {answer - 5} and {answer + 5}
        </motion.div>
      )}

      {/* Equation Display */}
      <motion.div 
        animate={shake ? { x: [-10, 10, -10, 10, 0], transition: { duration: 0.4 } } : {}}
        className={clsx(
          "w-full bg-card border-2 py-10 sm:py-14 rounded-3xl shadow-xl mb-6 flex flex-col items-center transition-colors duration-300",
          shake && "border-destructive shadow-[0_0_30px_rgba(255,0,0,0.15)]",
          solved && "border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)] bg-green-500/5"
        )}
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", bounce: 0.5 }}
          className="text-5xl sm:text-6xl font-black tracking-widest text-foreground select-none"
        >
          {equation}
        </motion.div>
        
        <motion.div 
          animate={solved ? { scale: 1.1 } : { scale: 1 }}
          className={clsx(
            "h-20 mt-8 flex items-center justify-center min-w-[160px] px-2 rounded-2xl border-4 transition-colors overflow-hidden",
            solved ? "bg-green-500 text-white border-green-600" : "bg-secondary/50 border-secondary",
            shake && "border-destructive text-destructive"
          )}
        >
           <input
             ref={inputRef}
             type="number"
             value={input}
             onChange={(e) => setInput(e.target.value.slice(0, 4))} // max 4 chars
             onKeyDown={handleKeyDown}
             disabled={isSubmitting || solved}
             className={clsx(
               "w-full h-full bg-transparent text-center text-4xl font-bold font-mono tracking-wider outline-none transition-colors", 
               solved && "text-white"
             )}
             placeholder="?"
             autoComplete="off"
           />
        </motion.div>
      </motion.div>
      
      <p className="text-muted-foreground text-sm font-medium animate-pulse">
        {solved ? "Correct!" : "Type the answer to auto-submit..."}
      </p>
    </motion.div>
  );
}
