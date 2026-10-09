"use client";

import { GameProps } from "@/types/game";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Palette } from "lucide-react";

const COLORS = [
  { name: "RED", hex: "#EF4444", tailwind: "text-red-500" },
  { name: "BLUE", hex: "#3B82F6", tailwind: "text-blue-500" },
  { name: "GREEN", hex: "#22C55E", tailwind: "text-green-500" },
  { name: "YELLOW", hex: "#EAB308", tailwind: "text-yellow-500" },
  { name: "PURPLE", hex: "#A855F7", tailwind: "text-purple-500" },
  { name: "ORANGE", hex: "#F97316", tailwind: "text-orange-500" },
  { name: "PINK", hex: "#EC4899", tailwind: "text-pink-500" },
  { name: "CYAN", hex: "#06B6D4", tailwind: "text-cyan-500" }
];

export default function StroopGame({ question, onAnswer, isSubmitting }: GameProps) {
  const [startTime] = useState(Date.now());
  const [wordIdx, setWordIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  const [choices, setChoices] = useState<(typeof COLORS[0] & { displayColorClass: string })[]>([]);
  
  // Timer setup based on difficulty
  const difficulty = question.difficulty || 'medium';
  // Give them a bit more time because the buttons are now also confusing
  const initialTime = difficulty === 'easy' ? 10 : (difficulty === 'medium' ? 8 : 6);
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    // Generate a mismatch on mount
    const wIdx = Math.floor(Math.random() * COLORS.length);
    let cIdx = Math.floor(Math.random() * COLORS.length);
    // Ensure they don't match for maximum confusion
    while (cIdx === wIdx) {
      cIdx = Math.floor(Math.random() * COLORS.length);
    }
    setWordIdx(wIdx);
    setColorIdx(cIdx);

    const correctColor = COLORS[cIdx];
    const otherColors = COLORS.filter(c => c.name !== correctColor.name).sort(() => 0.5 - Math.random());
    const numDecoys = difficulty === 'easy' ? 3 : (difficulty === 'medium' ? 5 : 7);
    const selectedDecoys = otherColors.slice(0, numDecoys);
    const finalChoices = [correctColor, ...selectedDecoys].sort(() => 0.5 - Math.random());
    
    // Assign a random confusing display color to each button!
    const confusingChoices = finalChoices.map(choice => {
      // Pick a random color for the button text that is NOT the choice's actual name
      const availableClasses = COLORS.filter(c => c.name !== choice.name).map(c => c.tailwind);
      const displayColorClass = availableClasses[Math.floor(Math.random() * availableClasses.length)];
      return { ...choice, displayColorClass };
    });
    
    setChoices(confusingChoices);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isSubmitting) return;

    if (timeLeft <= 0) {
      onAnswer("TIME_OUT", false, initialTime);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 0.1));
    }, 100);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting, initialTime, onAnswer]);

  const handleSelect = (selectedColorName: string) => {
    if (isSubmitting) return;
    const timeTaken = (Date.now() - startTime) / 1000;
    // The correct answer is the COLOR of the font, not the word itself!
    const isCorrect = selectedColorName === COLORS[colorIdx].name;
    
    // Pass the selected string so the parent knows what they chose
    onAnswer(selectedColorName, {
      customIsCorrect: isCorrect,
      dynamicCorrectAnswer: COLORS[colorIdx].name
    }, timeTaken);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Palette className="text-pink-500" /> Color Confusion
      </h2>
      <p className="text-muted-foreground mb-4">
        Click the button that matches the <strong>FONT COLOR</strong>, not the word!
      </p>

      {/* Progress Bar for Time Limit */}
      <div className="w-full max-w-md h-2 bg-muted rounded-full mb-8 overflow-hidden">
        <div 
          className={clsx("h-full transition-all duration-100 linear", 
            timeLeft / initialTime < 0.3 ? "bg-red-500" : "bg-primary"
          )}
          style={{ width: `${(timeLeft / initialTime) * 100}%` }}
        />
      </div>
      
      <div className="w-full h-48 flex items-center justify-center bg-card border border-border rounded-2xl mb-8 shadow-inner">
        <span className={clsx("text-6xl sm:text-7xl font-black tracking-widest", COLORS[colorIdx].tailwind)}>
          {COLORS[wordIdx].name}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {choices.map((color) => (
          <button
            key={color.name}
            onClick={() => handleSelect(color.name)}
            disabled={isSubmitting}
            className={`font-black py-6 rounded-2xl border-2 border-border bg-card hover:bg-secondary/50 transition-all active:scale-95 shadow-sm text-2xl ${color.displayColorClass}`}
          >
            {color.name}
          </button>
        ))}
      </div>
    </div>
  );
}
