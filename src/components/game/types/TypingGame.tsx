import React, { useState, useEffect, useRef } from 'react';
import { GameComponentProps } from './game';

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
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTargetSentence(sentences[Math.floor(Math.random() * sentences.length)]);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting) return;
    
    if (!startTime) setStartTime(Date.now());
    
    const value = e.target.value;
    setInput(value);

    if (value === targetSentence) {
      const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const isPerfect = true; // They typed it perfectly
      onAnswer(value, { customIsCorrect: true, customTimeSpent: timeSpent, isPerfect });
    }
  };

  const getCharClass = (char: string, index: number) => {
    if (index >= input.length) return "text-muted-foreground opacity-40";
    return input[index] === char ? "text-green-500" : "text-red-500 bg-red-500/20";
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl shadow-sm w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Speed Typing</h3>
        <p className="text-muted-foreground">Type the sentence exactly as it appears. Timer starts on your first keystroke.</p>
      </div>

      <div className="mb-8 p-6 bg-secondary/20 rounded-xl w-full text-center relative border border-border">
        {/* We use relative positioning to overlay the input invisibly to capture mobile keyboards while showing stylized text */}
        <p className="font-mono text-xl sm:text-2xl tracking-wide leading-relaxed select-none">
          {targetSentence.split('').map((char, i) => (
            <span key={i} className={`transition-colors ${getCharClass(char, i)}`}>
              {char}
            </span>
          ))}
        </p>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        disabled={isSubmitting}
        className="w-full text-xl p-4 rounded-xl border-2 border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono bg-background"
        placeholder="Start typing..."
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  );
}
