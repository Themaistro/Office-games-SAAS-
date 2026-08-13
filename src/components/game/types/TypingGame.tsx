import React, { useState, useEffect, useRef } from 'react';
import { GameComponentProps } from '@/types/game';
import { Clock, Activity, Target } from 'lucide-react';
import { clsx } from 'clsx';

const sentences = [
  "The quick brown fox jumps over the lazy dog.",
  "Typing fast requires practice and muscle memory.",
  "Always write code as if the guy who ends up maintaining it will be a violent psychopath.",
  "React is a library for building user interfaces.",
  "Brain Arena challenges your cognitive speed."
];

export default function TypingGame({ onAnswer, isSubmitting }: GameComponentProps) {
  const [targetSentence, setTargetSentence] = useState("");
  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const [gameState, setGameState] = useState<'prep' | 'play'>('prep');
  const [prepTimeLeft, setPrepTimeLeft] = useState(5);
  const [playTimeLeft, setPlayTimeLeft] = useState(30);
  const [failed, setFailed] = useState(false);
  
  // Premium Stats
  const [totalErrors, setTotalErrors] = useState(0);
  const [shake, setShake] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTargetSentence(sentences[Math.floor(Math.random() * sentences.length)]);
  }, []);

  // Prep Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'prep') {
      timer = setInterval(() => {
        setPrepTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('play');
            setStartTime(Date.now());
            // Give React a tick to enable the input before focusing
            setTimeout(() => inputRef.current?.focus(), 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState]);

  // Play Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'play' && !failed && !isSubmitting && playTimeLeft > 0) {
      timer = setInterval(() => {
        setPlayTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, failed, isSubmitting, playTimeLeft]);

  // Handle Timeout Auto-submit
  useEffect(() => {
    if (playTimeLeft === 0 && gameState === 'play' && !failed && !isSubmitting) {
      setFailed(true);
      submitCurrentInput();
    }
  }, [playTimeLeft, gameState, failed, isSubmitting]);

  const calculateScore = (currentInput: string) => {
    const targetWords = targetSentence.trim().split(/\s+/);
    const inputWords = currentInput.trim().split(/\s+/);
    let correct = 0;
    
    for (let i = 0; i < Math.min(targetWords.length, inputWords.length); i++) {
      if (targetWords[i] === inputWords[i]) {
        correct++;
      }
    }
    
    const percentage = targetWords.length > 0 ? correct / targetWords.length : 0;
    return { accuracy: percentage, isPerfect: percentage === 1 };
  };

  const submitCurrentInput = (finalInput: string = input) => {
    if (isSubmitting) return;
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 30;
    
    const { accuracy, isPerfect } = calculateScore(finalInput);
    
    onAnswer(finalInput || "[Timeout]", { 
      customIsCorrect: accuracy > 0, 
      customTimeSpent: timeSpent, 
      isPerfect,
      customScoreModifiers: {
        accuracy
      }
    }, timeSpent);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting || gameState === 'prep') return;
    
    const value = e.target.value;
    
    // Check if the latest typed character is wrong
    if (value.length > input.length) {
      const latestChar = value[value.length - 1];
      const targetChar = targetSentence[value.length - 1];
      if (latestChar !== targetChar) {
        setTotalErrors(prev => prev + 1);
        
        // Trigger shake effect
        setShake(true);
        setTimeout(() => setShake(false), 300);
      }
    }
    
    setInput(value);

    // Auto-submit if they typed the exact target sentence correctly
    if (value === targetSentence) {
      setFailed(true); // freeze the timer
      submitCurrentInput(value);
    }
  };

  const handleSubmitClick = () => {
    setFailed(true);
    submitCurrentInput(input);
  };
  
  // Calculate Live Stats
  const timeElapsedMs = startTime ? Date.now() - startTime : 0;
  const timeElapsedMinutes = timeElapsedMs / 60000;
  // WPM = (total characters / 5) / minutes
  const wpm = timeElapsedMinutes > 0.05 ? Math.round((input.length / 5) / timeElapsedMinutes) : 0;
  const liveAccuracy = input.length > 0 ? Math.max(0, Math.round(((input.length - totalErrors) / input.length) * 100)) : 100;

  // Render the text with MonkeyType styling
  const renderText = () => {
    const chars = targetSentence.split('');
    return chars.map((char, index) => {
      const isActive = index === input.length && gameState === 'play';
      const isTyped = index < input.length;
      const isCorrect = isTyped && input[index] === char;
      const isWrong = isTyped && input[index] !== char;
      
      return (
        <span 
          key={index} 
          className={clsx(
            "relative transition-colors duration-150 rounded-sm",
            isActive && "text-foreground",
            !isActive && !isTyped && "text-muted-foreground opacity-30",
            isCorrect && "text-primary",
            isWrong && "text-destructive bg-destructive/10 underline decoration-destructive/50"
          )}
        >
          {/* Simulated Caret */}
          {isActive && (
            <span className="absolute -left-[1px] top-[10%] h-[80%] w-[2px] bg-primary animate-pulse rounded-full" />
          )}
          {char}
        </span>
      );
    });
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto"
      onClick={() => inputRef.current?.focus()} // Clicking anywhere focuses the hidden input
    >
      <div className="w-full flex justify-between items-end mb-6 px-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> Speed Typing
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            {gameState === 'prep' ? 'Get ready...' : 'Type as fast and accurately as possible.'}
          </p>
        </div>
        
        {/* Live Stats */}
        <div className="flex gap-4 sm:gap-6 text-right">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <Clock size={12} /> Time
            </span>
            <span className={clsx(
              "text-xl font-mono font-bold",
              gameState === 'prep' ? "text-primary" : playTimeLeft <= 10 ? "text-destructive animate-pulse" : "text-foreground"
            )}>
              {gameState === 'prep' ? prepTimeLeft : playTimeLeft}s
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">WPM</span>
            <span className="text-xl font-mono font-bold text-foreground">{wpm}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
              <Target size={12} /> Acc
            </span>
            <span className={clsx("text-xl font-mono font-bold", liveAccuracy < 90 ? "text-destructive" : "text-primary")}>
              {liveAccuracy}%
            </span>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={clsx(
          "w-full bg-card border border-border/50 shadow-xl rounded-3xl p-6 sm:p-10 min-h-[250px] flex items-center justify-center relative overflow-hidden transition-transform duration-75",
          shake && "-translate-x-2 translate-y-1 border-destructive/50",
          gameState === 'prep' && "opacity-80 scale-[0.98]"
        )}
        style={{
          boxShadow: shake ? '0 0 40px -10px rgba(255, 0, 0, 0.2)' : undefined
        }}
      >
        {/* Hidden Input field (captures mobile keyboards & all typing) */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          disabled={isSubmitting || gameState === 'prep' || failed}
          className="absolute inset-0 opacity-0 cursor-default text-[16px]" // 16px prevents iOS zoom
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
        />

        <p className="font-mono text-2xl sm:text-3xl lg:text-4xl tracking-wide leading-relaxed select-none max-w-3xl text-center">
          {renderText()}
        </p>
      </div>

      <div className="mt-8">
        {gameState === 'play' && (
          <button
            onClick={(e) => { e.stopPropagation(); handleSubmitClick(); }}
            disabled={isSubmitting || failed}
            className="px-8 py-3 rounded-xl bg-secondary/50 hover:bg-secondary text-secondary-foreground font-bold transition-colors border border-border disabled:opacity-50"
          >
            Submit Partial
          </button>
        )}
      </div>
    </div>
  );
}
