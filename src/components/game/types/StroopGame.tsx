import { GameProps } from "@/types/game";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Palette } from "lucide-react";

const COLORS = [
  { name: "RED", hex: "#EF4444", tailwind: "text-red-500" },
  { name: "BLUE", hex: "#3B82F6", tailwind: "text-blue-500" },
  { name: "GREEN", hex: "#22C55E", tailwind: "text-green-500" },
  { name: "YELLOW", hex: "#EAB308", tailwind: "text-yellow-500" },
];

export default function StroopGame({ onAnswer, isSubmitting }: GameProps) {
  const [startTime] = useState(Date.now());
  const [wordIdx, setWordIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(0);
  
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
  }, []);

  const handleSelect = (selectedColorName: string) => {
    if (isSubmitting) return;
    const timeTaken = (Date.now() - startTime) / 1000;
    // The correct answer is the COLOR of the font, not the word itself!
    const isCorrect = selectedColorName === COLORS[colorIdx].name;
    
    // Pass the selected string so the parent knows what they chose
    onAnswer(selectedColorName, isCorrect, timeTaken);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Palette className="text-pink-500" /> Color Confusion
      </h2>
      <p className="text-muted-foreground mb-8">
        Click the button that matches the <strong>FONT COLOR</strong>, not the word!
      </p>
      
      <div className="w-full h-48 flex items-center justify-center bg-card border border-border rounded-2xl mb-8 shadow-inner">
        <span className={clsx("text-6xl sm:text-7xl font-black tracking-widest", COLORS[colorIdx].tailwind)}>
          {COLORS[wordIdx].name}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => handleSelect(color.name)}
            disabled={isSubmitting}
            className="font-bold py-6 rounded-xl border border-border bg-card hover:bg-secondary/50 text-foreground transition-transform active:scale-95 shadow-sm text-xl"
          >
            {color.name}
          </button>
        ))}
      </div>
    </div>
  );
}
