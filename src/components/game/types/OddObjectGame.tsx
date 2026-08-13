import React, { useState, useEffect } from 'react';
import { GameComponentProps } from './game';
import { Ghost, Shield, Zap, Flame, Droplet, Star } from 'lucide-react';

const icons = [Ghost, Shield, Zap, Flame, Droplet, Star];
const colors = ['text-blue-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-pink-500'];

export default function OddObjectGame({ onAnswer, isSubmitting }: GameComponentProps) {
  const [grid, setGrid] = useState<{ id: number, isOdd: boolean, Icon: any, color: string }[]>([]);
  const [startTime] = useState(Date.now());
  const gridSize = 25; // 5x5 grid

  useEffect(() => {
    // Generate a random base icon and color
    const baseIcon = icons[Math.floor(Math.random() * icons.length)];
    const baseColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Generate a slightly different odd icon or color
    const isDifferentColor = Math.random() > 0.5;
    const oddIcon = isDifferentColor ? baseIcon : icons.find(i => i !== baseIcon) || Star;
    const oddColor = isDifferentColor ? colors.find(c => c !== baseColor) || 'text-red-500' : baseColor;

    const oddIndex = Math.floor(Math.random() * gridSize);
    
    const newGrid = Array.from({ length: gridSize }).map((_, i) => {
      if (i === oddIndex) {
        return { id: i, isOdd: true, Icon: oddIcon, color: oddColor };
      }
      return { id: i, isOdd: false, Icon: baseIcon, color: baseColor };
    });
    
    setGrid(newGrid);
  }, []);

  const handleSelect = (isOdd: boolean) => {
    if (isSubmitting) return;
    const isPerfect = (Date.now() - startTime) < 3000; // Perfect if found under 3 seconds
    onAnswer(isOdd ? "Found It!" : "Wrong Object", { customIsCorrect: isOdd, isPerfect });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-2xl shadow-sm w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">Find the Odd Object</h3>
        <p className="text-muted-foreground">Click the one icon that is different from the rest.</p>
      </div>

      <div className="grid grid-cols-5 gap-3 p-4 bg-secondary/10 rounded-xl">
        {grid.map((item) => {
          const { Icon } = item;
          return (
            <button
              key={item.id}
              disabled={isSubmitting}
              onClick={() => handleSelect(item.isOdd)}
              className={`p-3 rounded-lg flex items-center justify-center transition-all bg-background border border-border hover:bg-accent/20 hover:scale-110 shadow-sm disabled:opacity-50`}
            >
              <Icon size={32} className={item.color} />
            </button>
          )
        })}
      </div>
    </div>
  );
}
