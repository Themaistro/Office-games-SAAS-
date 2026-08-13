import { GameProps } from "@/types/game";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Copy } from "lucide-react";

const EMOJIS = ["🚀", "🎸", "👾", "🍕", "🎮", "🌟"];

interface Card {
  id: number;
  emoji: string;
}

export default function CardMatchGame({ onAnswer, isSubmitting }: GameProps) {
  const [startTime] = useState(Date.now());
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIdxs, setFlippedIdxs] = useState<number[]>([]);
  const [matchedIdxs, setMatchedIdxs] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    // Create pairs and shuffle
    const deck = [...EMOJIS, ...EMOJIS]
      .map((emoji, index) => ({ id: index, emoji }))
      .sort(() => Math.random() - 0.5);
    setCards(deck);
  }, []);

  useEffect(() => {
    if (matchedIdxs.length === 12) {
      // Game Complete!
      const timeTaken = (Date.now() - startTime) / 1000;
      // You get it wrong if you made more than 10 errors, otherwise correct!
      const isCorrect = errors < 10;
      onAnswer(`Errors: ${errors}`, isCorrect, timeTaken);
    }
  }, [matchedIdxs, errors, startTime, onAnswer]);

  const handleCardClick = (idx: number) => {
    if (isSubmitting || flippedIdxs.length === 2 || flippedIdxs.includes(idx) || matchedIdxs.includes(idx)) {
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
      <p className="text-muted-foreground mb-8 text-center px-4">
        Find all the matching pairs as fast as possible.
      </p>
      
      <div className="grid grid-cols-4 gap-3 w-full max-w-sm mx-auto mb-8">
        {cards.map((card, i) => {
          const isFlipped = flippedIdxs.includes(i) || matchedIdxs.includes(i);
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
