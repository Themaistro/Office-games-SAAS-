import { GameProps } from "@/types/game";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { Grid3x3 } from "lucide-react";

const GRID_SIZE = 9; // 3x3
const SEQUENCE_LENGTH = 5; // Numbers 1 to 5

export default function SequenceGame({ onAnswer, isSubmitting }: GameProps) {
  const [startTime] = useState(Date.now());
  const [grid, setGrid] = useState<(number | null)[]>(Array(GRID_SIZE).fill(null));
  const [currentStep, setCurrentStep] = useState(1);
  const [failed, setFailed] = useState(false);
  
  useEffect(() => {
    // Distribute numbers 1 to SEQUENCE_LENGTH randomly in the grid
    const newGrid = Array(GRID_SIZE).fill(null);
    let placed = 0;
    while (placed < SEQUENCE_LENGTH) {
      const randomPos = Math.floor(Math.random() * GRID_SIZE);
      if (newGrid[randomPos] === null) {
        newGrid[randomPos] = placed + 1;
        placed++;
      }
    }
    setGrid(newGrid);
  }, []);

  const handleTileClick = (index: number) => {
    if (isSubmitting || failed || grid[index] === null) return;
    
    const clickedNumber = grid[index];
    
    if (clickedNumber === currentStep) {
      // Correct!
      const newGrid = [...grid];
      // We keep it as "null" to hide it, but wait, if it's correct we just remove it.
      newGrid[index] = null;
      setGrid(newGrid);
      
      if (currentStep === SEQUENCE_LENGTH) {
        // Won!
        const timeTaken = (Date.now() - startTime) / 1000;
        onAnswer("Completed Sequence", true, timeTaken);
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Wrong!
      setFailed(true);
      const timeTaken = (Date.now() - startTime) / 1000;
      onAnswer("Failed Sequence", false, timeTaken);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Grid3x3 className="text-purple-500" /> Sequence Memory
      </h2>
      <p className="text-muted-foreground mb-8 text-center px-4">
        Click the numbers in order from 1 to {SEQUENCE_LENGTH}. <br />
        <span className="font-bold text-foreground">Warning: After clicking 1, the other numbers will hide!</span>
      </p>
      
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto mb-8">
        {grid.map((num, i) => {
          // If we are past step 1, we hide the numbers (but keep the tile click-able)
          const isHidden = currentStep > 1 && num !== null;
          const isEmpty = num === null;
          
          return (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              disabled={isSubmitting || failed || isEmpty}
              className={clsx(
                "aspect-square rounded-xl text-3xl font-bold flex items-center justify-center transition-all",
                isEmpty ? "bg-transparent cursor-default" : "bg-card border-2 shadow-sm hover:scale-105 active:scale-95 cursor-pointer",
                failed && num !== null && num !== currentStep && "border-red-500 bg-red-100 dark:bg-red-900",
                failed && num === currentStep && "border-green-500 bg-green-100 dark:bg-green-900"
              )}
            >
              {/* Show number if it's step 1 OR if they failed (to show what they missed) */}
              {(!isHidden || failed) && num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
