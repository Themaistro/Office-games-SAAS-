import { GameProps } from "@/types/game";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Brain } from "lucide-react";

export default function MemoryGame({ question, onAnswer, isSubmitting }: GameProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [phase, setPhase] = useState<'memorize' | 'recall'>('memorize');
  const [timeLeft, setTimeLeft] = useState(5);
  const [input, setInput] = useState("");

  // Memorization timer
  useEffect(() => {
    if (phase !== 'memorize') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('recall');
          setStartTime(Date.now());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !startTime) return;
    
    const timeTaken = (Date.now() - startTime) / 1000;
    const isCorrect = input.trim() === question.correct_answer;
    
    onAnswer(input.trim(), isCorrect, timeTaken);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2">Memory Challenge</h2>
      
      {phase === 'memorize' ? (
        <>
          <p className="text-muted-foreground mb-6 flex items-center gap-2">
            <Brain size={18} /> Memorize this sequence. Hiding in {timeLeft}s
          </p>
          <div className="bg-primary text-primary-foreground p-10 rounded-2xl mb-8 text-4xl sm:text-5xl font-mono tracking-widest font-bold shadow-lg animate-in zoom-in duration-300">
            {question.content.text}
          </div>
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-6">Type the sequence you just saw.</p>
          <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in duration-300">
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-card border-2 border-border focus:border-primary focus:ring-0 rounded-xl px-6 py-5 text-center text-3xl font-mono tracking-widest outline-none shadow-sm"
              placeholder="••••"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !input}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-lg disabled:opacity-50 disabled:active:scale-100"
            >
              SUBMIT
            </button>
          </form>
        </>
      )}
    </div>
  );
}
