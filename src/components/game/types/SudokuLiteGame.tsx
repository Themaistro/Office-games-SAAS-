import React, { useState, useEffect } from 'react';
import { GameComponentProps } from '@/types/game';

export default function SudokuLiteGame({ question, onAnswer, isSubmitting }: GameComponentProps) {
  // A simple 4x4 Sudoku logic game
  // In a real version, this board would be generated or passed from the database content.
  // We'll hardcode a simple MVP version.
  const [board, setBoard] = useState<(number | null)[][]>([
    [1, null, 3, 4],
    [3, 4, 1, 2],
    [null, 1, 4, 3],
    [4, 3, 2, 1]
  ]);

  const solution = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1]
  ];

  const [mistakes, setMistakes] = useState(0);

  const handleInput = (row: number, col: number, value: string) => {
    if (isSubmitting) return;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 4) return;

    if (solution[row][col] === num) {
      const newBoard = [...board];
      newBoard[row][col] = num;
      setBoard(newBoard);
      
      // Check for completion
      if (newBoard.every(r => r.every(c => c !== null))) {
        const isPerfect = mistakes === 0;
        onAnswer("Solved", { customIsCorrect: true, isPerfect });
      }
    } else {
      setMistakes(m => m + 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-2xl shadow-sm w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold">Sudoku Lite</h3>
        <p className="text-muted-foreground">Fill the 4x4 grid. Numbers 1-4 only.</p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6 p-2 bg-secondary/20 rounded-xl">
        {board.map((row, rIndex) => (
          row.map((cell, cIndex) => (
            <div key={`${rIndex}-${cIndex}`} className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
              {cell !== null ? (
                <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-xl rounded-lg shadow-sm">
                  {cell}
                </div>
              ) : (
                <input
                  type="text"
                  maxLength={1}
                  className="w-full h-full text-center bg-background border-2 border-primary/20 text-foreground font-bold text-xl rounded-lg shadow-inner focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  onChange={(e) => handleInput(rIndex, cIndex, e.target.value)}
                  disabled={isSubmitting}
                  value="" // Always empty until correct
                />
              )}
            </div>
          ))
        ))}
      </div>

      {mistakes > 0 && (
        <div className="text-red-500 font-bold mb-4 animate-pulse">
          Mistakes: {mistakes}
        </div>
      )}
    </div>
  );
}
