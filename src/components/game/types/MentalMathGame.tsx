import React, { useState, useEffect, useRef } from 'react';
import { GameComponentProps } from '@/types/game';

export default function MentalMathGame({ onAnswer, isSubmitting }: GameComponentProps) {
  const [equation, setEquation] = useState("");
  const [answer, setAnswer] = useState(0);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate a quick math problem
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
    
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !input) return;

    const numInput = parseInt(input, 10);
    const isCorrect = numInput === answer;
    
    onAnswer(input, { customIsCorrect: isCorrect, isPerfect: isCorrect }); // First try = perfect
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl shadow-sm w-full max-w-sm mx-auto text-center">
      <h3 className="text-2xl font-bold mb-2">Mental Math</h3>
      <p className="text-muted-foreground mb-8">Solve the equation as quickly as you can.</p>

      <div className="bg-primary text-primary-foreground font-bold text-5xl py-8 px-12 rounded-2xl shadow-inner mb-8 tracking-widest w-full">
        {equation}
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
        <input
          ref={inputRef}
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSubmitting}
          className="w-full text-center text-3xl font-bold p-4 rounded-xl border-2 border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-background"
          placeholder="?"
        />
        
        <button
          type="submit"
          disabled={isSubmitting || !input}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50 text-lg"
        >
          SUBMIT
        </button>
      </form>
    </div>
  );
}
