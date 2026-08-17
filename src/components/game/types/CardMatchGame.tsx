"use client";

import { GameComponentProps } from "@/types/game";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Copy } from "lucide-react";

const ALL_EMOJIS = [
  "🚀", "🎸", "👾", "🍕", "🎮", "🌟", "🍔", "🍟", "🌭", "🍿", "🍩", "🍦",
  "🍎", "🍉", "🍇", "🍓", "🏀", "⚽", "🎾", "🏈", "🎱", "🚗", "🚕", "🚙",
  "🚌", "🚒", "✈️", "🚁", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
  "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐙", "🦀", "🐠", "🐬",
  "🐳", "🌵", "🌴", "🌲", "🍀", "🍁", "🍄", "🌎", "🌙", "☀️", "⭐", "🔥",
  "💧", "❄️", "⚡", "🌈", "🎈", "🎉", "🎁", "🎃", "👻", "👽", "🤖", "💎"
];

interface Card {
  id: number;
  emoji: string;
}

export default function CardMatchGame({ question, onAnswer, isSubmitting, showHint }: GameComponentProps) {
  const difficulty = question?.difficulty || 'medium';
  // Easy: 12 cards, Medium: 16 cards, Hard: 20 cards
  const initialTime = difficulty === 'easy' ? 60 : (difficulty === 'medium' ? 50 : 45);
  const previewDuration = 3000; // Always show cards for 3 seconds initially
  const totalCards = question?.content?.cards?.length || (difficulty === 'easy' ? 12 : (difficulty === 'medium' ? 16 : 20));
  
  const [startTime] = useState(Date.now());
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIdxs, setFlippedIdxs] = useState<number[]>([]);
  const [matchedIdxs, setMatchedIdxs] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isPreviewing, setIsPreviewing] = useState(previewDuration > 0);
  const [isHintActive, setIsHintActive] = useState(false);

  useEffect(() => {
    if (showHint) {
      setIsHintActive(true);
      const duration = difficulty === 'easy' ? 1500 : (difficulty === 'medium' ? 2500 : 3500);
      const timeoutId = setTimeout(() => {
        setIsHintActive(false);
      }, duration);
      return () => clearTimeout(timeoutId);
    }
  }, [showHint, difficulty]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only start countdown timer AFTER preview finishes
    if (isPreviewing) return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPreviewing]);

  useEffect(() => {
    if (timeLeft === 0 && matchedIdxs.length < totalCards && !isSubmitting) {
      onAnswer(`Time's up!`, false, initialTime);
    }
  }, [timeLeft, matchedIdxs.length, onAnswer, isSubmitting, initialTime, totalCards]);

  useEffect(() => {
    if (question?.content?.cards) {
      setCards(question.content.cards);
    } else {
      // Fallback
      const numPairs = totalCards / 2;
      const shuffledEmojis = [...ALL_EMOJIS].sort(() => Math.random() - 0.5).slice(0, numPairs);
      const deck = [...shuffledEmojis, ...shuffledEmojis]
        .map((emoji, index) => ({ id: index, emoji }))
        .sort(() => Math.random() - 0.5);
      setCards(deck as Card[]);
    }
    
    setFlippedIdxs([]);
    setMatchedIdxs([]);
    setErrors(0);
    setTimeLeft(initialTime);
    setIsHintActive(false);
    setIsPreviewing(previewDuration > 0);
    
    // Handle Preview Phase
    if (previewDuration > 0) {
      const allIdxs = Array.from({ length: totalCards }).map((_, i) => i);
      setFlippedIdxs(allIdxs);
      
      setTimeout(() => {
        setFlippedIdxs([]);
        setIsPreviewing(false);
      }, previewDuration);
    }
  }, [question, previewDuration, totalCards, initialTime]);

  useEffect(() => {
    if (matchedIdxs.length === totalCards && !isSubmitting) {
      // Game Complete!
      if (timerRef.current) clearInterval(timerRef.current);
      const timeTaken = (Date.now() - startTime) / 1000;
      // You get it wrong if you made more than 10 errors, otherwise correct!
      const isCorrect = errors <= 15;
      onAnswer(`Errors: ${errors}`, {
        customIsCorrect: isCorrect,
        isPerfect: errors === 0,
        customScoreModifiers: {
          mistakes: errors,
          customSpeedBonus: Math.max(0, timeLeft)
        }
      }, timeTaken);
    }
  }, [matchedIdxs.length, errors, startTime, onAnswer, isSubmitting, totalCards, timeLeft]);

  const handleCardClick = (idx: number) => {
    if (isSubmitting || isPreviewing || flippedIdxs.length === 2 || flippedIdxs.includes(idx) || matchedIdxs.includes(idx)) {
      return;
    }

    const newFlipped = [...flippedIdxs, idx];
    setFlippedIdxs(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        // Match!
        setMatchedIdxs([...matchedIdxs, first, second]);
        setFlippedIdxs([]);
      } else {
        // No match, flip back after a short delay
        setErrors(prev => prev + 1);
        setTimeout(() => {
          setFlippedIdxs([]);
        }, 800);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Copy className="text-orange-500" /> Concentration Match
      </h2>
      <p className="text-muted-foreground mb-4 text-center px-4">
        Find all the matching pairs before time runs out.
      </p>

      <div className="flex items-center gap-2 mb-8 font-mono text-xl font-bold bg-card border border-border px-4 py-2 rounded-lg">
        <span className={timeLeft <= 10 ? "text-destructive animate-pulse" : "text-primary"}>
          00:{timeLeft.toString().padStart(2, '0')}
        </span>
      </div>

      {isHintActive && matchedIdxs.length < totalCards && (
        <div className="mb-6 text-orange-500 font-bold bg-orange-500/10 px-4 py-2 rounded-lg animate-pulse w-full max-w-xs mx-auto text-sm text-center">
          Hint: Match the items!
        </div>
      )}
      
      <div className={clsx(
        "grid gap-3 w-full max-w-md mx-auto mb-8",
        totalCards === 20 ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-4"
      )}>
        {cards.map((card, i) => {
          const isFlipped = flippedIdxs.includes(i) || matchedIdxs.includes(i) || (isHintActive && !matchedIdxs.includes(i));
          const isMatched = matchedIdxs.includes(i);
          
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(i)}
              disabled={isSubmitting || isFlipped}
              className={clsx(
                "aspect-square rounded-xl text-4xl flex items-center justify-center transition-all duration-300",
                !isFlipped && "bg-primary/20 border-2 border-primary/30 hover:bg-primary/30 cursor-pointer shadow-sm",
                isFlipped && !isMatched && "bg-card border-2 border-border rotate-y-180",
                isMatched && "bg-green-100 dark:bg-green-900/40 border-2 border-green-500/50 scale-95 opacity-80"
              )}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(0deg)" : "rotateY(180deg)"
              }}
            >
              <div 
                className={clsx(
                  "transition-opacity duration-300",
                  isFlipped ? "opacity-100" : "opacity-0"
                )}
              >
                {card.emoji}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
        Mistakes: <span className="text-foreground">{errors}</span>
      </div>
    </div>
  );
}
