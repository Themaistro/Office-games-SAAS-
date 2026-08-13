import React, { useState, useEffect } from 'react';
import { GameComponentProps } from './game';

const wordsList = ["ASTRONAUT", "BUTTERFLY", "CHALLENGE", "DISCOVERY", "ELEVATOR", "FIREWORKS", "GRAVITY", "HOSPITAL", "INTERNET", "JUNGLE"];

export default function UnscrambleGame({ onAnswer, isSubmitting }: GameComponentProps) {
  const [word, setWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    const selectedWord = wordsList[Math.floor(Math.random() * wordsList.length)];
    setWord(selectedWord);
    
    // Scramble the word (ensure it's actually scrambled)
    let scrambledWord = selectedWord;
    while (scrambledWord === selectedWord) {
      scrambledWord = selectedWord.split('').sort(() => 0.5 - Math.random()).join('');
    }
    setScrambled(scrambledWord);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !input) return;

    if (input.toUpperCase() === word) {
      const isPerfect = mistakes === 0;
      onAnswer(word, { customIsCorrect: true, isPerfect });
    } else {
      setMistakes(m => m + 1);
      setInput("");
      // Don't auto-submit a failure unless we want to end the game on first strike.
      // We'll let them keep guessing, but penalize perfect score.
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl shadow-sm w-full max-w-md mx-auto text-center">
      <h3 className="text-2xl font-bold mb-2">Word Unscramble</h3>
      <p className="text-muted-foreground mb-8">Unscramble the letters to form a word.</p>

      <div className="flex gap-2 mb-8 flex-wrap justify-center">
        {scrambled.split('').map((letter, index) => (
          <div key={index} className="w-12 h-12 flex items-center justify-center bg-primary/10 border-2 border-primary text-primary font-bold text-2xl rounded-lg shadow-sm">
            {letter}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          disabled={isSubmitting}
          className="w-full max-w-xs text-center text-2xl font-bold p-4 rounded-xl border-2 border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mb-4 bg-background uppercase tracking-widest"
          placeholder="TYPE HERE"
          autoFocus
        />
        
        {mistakes > 0 && (
          <p className="text-red-500 font-bold mb-4 animate-bounce">Incorrect guess. Try again!</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !input}
          className="w-full max-w-xs bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
        >
          SUBMIT WORD
        </button>
      </form>
    </div>
  );
}
