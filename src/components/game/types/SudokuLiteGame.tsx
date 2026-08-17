"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { GameComponentProps } from '@/types/game';
import { clsx } from 'clsx';
import { Lightbulb, Trash2 } from 'lucide-react';

// --- 6x6 Sudoku Generator ---
function generateSudoku(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
  // Base valid 6x6 board
  // 6x6 Sudoku has 2x3 rectangular subgrids
  let board = [
    [1, 2, 3, 4, 5, 6],
    [4, 5, 6, 1, 2, 3],
    [2, 3, 1, 5, 6, 4],
    [5, 6, 4, 2, 3, 1],
    [3, 1, 2, 6, 4, 5],
    [6, 4, 5, 3, 1, 2]
  ];

  const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

  // 1. Swap numbers randomly (e.g. all 1s become 3s, etc.)
  const numMapping = shuffle([1, 2, 3, 4, 5, 6]);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      board[r][c] = numMapping[board[r][c] - 1];
    }
  }

  // Helper to swap rows
  const swapRows = (r1: number, r2: number) => {
    const temp = board[r1];
    board[r1] = board[r2];
    board[r2] = temp;
  };

  // Helper to swap cols
  const swapCols = (c1: number, c2: number) => {
    for (let r = 0; r < 6; r++) {
      const temp = board[r][c1];
      board[r][c1] = board[r][c2];
      board[r][c2] = temp;
    }
  };

  // 2. Shuffle rows within bands (bands: 0-1, 2-3, 4-5)
  if (Math.random() > 0.5) swapRows(0, 1);
  if (Math.random() > 0.5) swapRows(2, 3);
  if (Math.random() > 0.5) swapRows(4, 5);

  // 3. Shuffle bands (swap band 0 and 1, etc.)
  const bands = [0, 1, 2];
  shuffle(bands);
  const newBoardRows = [];
  for (let b of bands) {
    newBoardRows.push(board[b * 2], board[b * 2 + 1]);
  }
  board = newBoardRows;

  // 4. Shuffle columns within stacks (stacks: 0-1-2, 3-4-5)
  const shuffleStack = (startCol: number) => {
    const cols = [startCol, startCol + 1, startCol + 2];
    shuffle(cols);
    const newCols = cols.map(c => board.map(row => row[c]));
    for (let r = 0; r < 6; r++) {
      board[r][startCol] = newCols[0][r];
      board[r][startCol + 1] = newCols[1][r];
      board[r][startCol + 2] = newCols[2][r];
    }
  };
  shuffleStack(0);
  shuffleStack(3);

  // 5. Shuffle stacks (swap stack 0 and stack 1)
  if (Math.random() > 0.5) {
    for (let i = 0; i < 3; i++) {
      swapCols(i, i + 3);
    }
  }

  // Save full solution
  const solution = board.map(row => [...row]);

  // Solver for uniqueness check
  const isValid = (b: (number | null)[][], r: number, c: number, num: number) => {
    for (let i = 0; i < 6; i++) {
      if (b[r][i] === num) return false;
      if (b[i][c] === num) return false;
    }
    const br = Math.floor(r / 2) * 2;
    const bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        if (b[br + i][bc + j] === num) return false;
      }
    }
    return true;
  };

  const countSolutions = (b: (number | null)[][]) => {
    let solutions = 0;
    const solve = () => {
      if (solutions > 1) return;
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (b[r][c] === null) {
            for (let num = 1; num <= 6; num++) {
              if (isValid(b, r, c, num)) {
                b[r][c] = num;
                solve();
                b[r][c] = null;
              }
            }
            return;
          }
        }
      }
      solutions++;
    };
    solve();
    return solutions;
  };

  // Determine difficulty
  let cellsToRemove = 18;
  if (difficulty === 'easy') cellsToRemove = Math.floor(Math.random() * 3) + 12; // 12-14
  else if (difficulty === 'medium') cellsToRemove = Math.floor(Math.random() * 3) + 16; // 16-18
  else if (difficulty === 'hard') cellsToRemove = Math.floor(Math.random() * 3) + 20; // 20-22

  let removed = 0;
  const puzzle = board.map(row => [...row]) as (number | null)[][];
  
  let attempts = 0;
  while (removed < cellsToRemove && attempts < 100) {
    const r = Math.floor(Math.random() * 6);
    const c = Math.floor(Math.random() * 6);
    if (puzzle[r][c] !== null) {
      const backup = puzzle[r][c];
      puzzle[r][c] = null;
      if (countSolutions(puzzle) === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup; // Put it back if it ruins uniqueness
      }
    }
    attempts++;
  }

  return { solution, puzzle };
}

export default function SudokuLiteGame({ question, onAnswer, isSubmitting, showHint }: GameComponentProps) {
  const [solution, setSolution] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<(number | null)[][]>([]);
  const [board, setBoard] = useState<(number | null)[][]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [errorCell, setErrorCell] = useState<[number, number] | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    const { solution, puzzle } = generateSudoku(question?.difficulty || 'medium');
    setSolution(solution);
    setInitialBoard(puzzle.map(row => [...row]));
    setBoard(puzzle.map(row => [...row]));
    setStartTime(Date.now());
    
    setSelectedCell(null);
    setMistakes(0);
    setErrorCell(null);
    setHintUsed(false);
    setIsCompleted(false);
  }, [question?.difficulty]);

  const handleUseHint = useCallback(() => {
    if (hintUsed || isSubmitting || isCompleted || board.length === 0) return;
    setHintUsed(true);

    // Find an empty cell or an incorrect cell
    let emptyCells: [number, number][] = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (board[r][c] === null || board[r][c] !== solution[r][c]) {
          // Exclude initial fixed cells
          if (initialBoard[r][c] === null) {
            emptyCells.push([r, c]);
          }
        }
      }
    }

    if (emptyCells.length > 0) {
      // Pick a random empty cell and fill it with the correct answer
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const [r, c] = randomCell;
      
      const newBoard = [...board];
      newBoard[r] = [...newBoard[r]];
      newBoard[r][c] = solution[r][c];
      setBoard(newBoard);
      
      // Clear selection if it was on this cell
      if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
        setSelectedCell(null);
      }
      
      checkCompletion(newBoard);
    }
  }, [board, hintUsed, initialBoard, isCompleted, isSubmitting, selectedCell, solution]);

  useEffect(() => {
    if (showHint && !hintUsed) {
      handleUseHint();
    }
  }, [showHint, hintUsed, handleUseHint]);

  const checkCompletion = useCallback((currentBoard: (number | null)[][]) => {
    let isFull = true;
    let isCorrect = true;
    
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (currentBoard[r][c] === null) {
          isFull = false;
        } else if (currentBoard[r][c] !== solution[r][c]) {
          isCorrect = false;
        }
      }
    }

    if (isFull) {
      if (isCorrect) {
        setIsCompleted(true);
        const timeTaken = (Date.now() - startTime) / 1000;
        const isPerfect = mistakes === 0;
        onAnswer("Solved", { customIsCorrect: true, isPerfect, customTimeSpent: timeTaken });
      } else {
        setErrorCell(selectedCell);
        setTimeout(() => setErrorCell(null), 500);
      }
    }
  }, [mistakes, onAnswer, selectedCell, solution, startTime]);

  const handleNumpadPress = useCallback((num: number | null) => {
    if (isSubmitting || isCompleted || !selectedCell) return;
    const [r, c] = selectedCell;

    // Don't allow changing initial fixed cells
    if (initialBoard[r][c] !== null) return;

    const newBoard = [...board];
    newBoard[r] = [...newBoard[r]];
    
    if (num === null) {
      // Erase
      newBoard[r][c] = null;
      setBoard(newBoard);
    } else {
      // Enter number
      // We do instant validation for the mini-game style flow
      if (num !== solution[r][c]) {
        setMistakes(m => m + 1);
        setErrorCell([r, c]);
        setTimeout(() => setErrorCell(null), 500);
        return; 
      }

      newBoard[r][c] = num;
      setBoard(newBoard);
      
      setSelectedCell(null);
      checkCompletion(newBoard);
    }
  }, [board, checkCompletion, initialBoard, isCompleted, isSubmitting, selectedCell, solution]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting || isCompleted || !selectedCell) return;
      
      if (e.key >= '1' && e.key <= '6') {
        handleNumpadPress(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleNumpadPress(null);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const [r, c] = selectedCell;
        let newR = r;
        let newC = c;
        if (e.key === 'ArrowUp' && r > 0) newR--;
        if (e.key === 'ArrowDown' && r < 5) newR++;
        if (e.key === 'ArrowLeft' && c > 0) newC--;
        if (e.key === 'ArrowRight' && c < 5) newC++;
        setSelectedCell([newR, newC]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumpadPress, isSubmitting, isCompleted, selectedCell]);

  if (board.length === 0) return null;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-8 w-full max-w-lg mx-auto overflow-hidden rounded-3xl">
      {/* Background glowing orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] -z-10 animate-pulse duration-1000 delay-500" />

      <div className="text-center mb-6">
        <h3 className="text-2xl font-black flex items-center justify-center gap-2">
          Sudoku Challenge
        </h3>
        <p className="text-muted-foreground mt-2 font-medium">6x6 Grid • Numbers 1-6 only</p>
        
        {mistakes > 0 && (
          <div className="mt-2 inline-block bg-destructive/10 text-destructive font-bold px-4 py-1 rounded-full text-sm">
            Mistakes: {mistakes}
          </div>
        )}
      </div>

      {/* Sudoku Grid */}
      <div className="relative bg-card/40 backdrop-blur-xl border-2 border-border shadow-2xl rounded-2xl p-2 mb-8 select-none mx-auto w-fit">
        <div className="grid grid-cols-6 gap-1">
          {board.map((row, r) => (
            row.map((cell, c) => {
              const isFixed = initialBoard[r][c] !== null;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isError = errorCell?.[0] === r && errorCell?.[1] === c;
              const isHighlightedNum = !isSelected && cell !== null && selectedCell && board[selectedCell[0]][selectedCell[1]] === cell;
              
              // 6x6 Subgrid borders (2x3 boxes)
              // Right borders on col 2
              const borderRight = c === 2 ? 'border-r-[3px] border-r-foreground/30' : '';
              // Bottom borders on row 1 and 3
              const borderBottom = (r === 1 || r === 3) ? 'border-b-[3px] border-b-foreground/30' : '';

              return (
                <div 
                  key={`${r}-${c}`}
                  onClick={() => {
                    if (!isFixed && !isCompleted && !isSubmitting) {
                      setSelectedCell([r, c]);
                    }
                  }}
                  className={clsx(
                    "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl font-black transition-all duration-200",
                    borderRight,
                    borderBottom,
                    isFixed 
                      ? "text-foreground bg-foreground/5 cursor-default" 
                      : "cursor-pointer hover:bg-primary/10 active:scale-95",
                    
                    // Selected state
                    isSelected && !isFixed && "bg-primary/20 shadow-inner border-2 border-primary/50 text-primary scale-110 rounded-xl z-10",
                    
                    // Highlight matching numbers
                    isHighlightedNum && "bg-primary/10 text-primary scale-105 rounded-xl z-10",

                    // Unselected user input state
                    !isFixed && !isSelected && !isHighlightedNum && cell !== null && "text-primary",
                    
                    // Error state
                    isError && "bg-destructive/30 border-2 border-destructive text-destructive animate-shake rounded-xl z-10"
                  )}
                >
                  {cell !== null ? cell : ""}
                </div>
              );
            })
          ))}
        </div>
      </div>

      {/* On-Screen Numpad */}
      <div className="w-full grid grid-cols-7 gap-2 max-w-[340px] mx-auto">
        {[1, 2, 3, 4, 5, 6].map(num => (
          <button
            key={num}
            onClick={() => handleNumpadPress(num)}
            disabled={!selectedCell || isSubmitting || isCompleted}
            className="h-12 sm:h-14 bg-card hover:bg-card/80 border border-border rounded-xl shadow-sm text-xl sm:text-2xl font-black flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {num}
          </button>
        ))}
        <button
            onClick={() => handleNumpadPress(null)}
            disabled={!selectedCell || isSubmitting || isCompleted}
            className="h-12 sm:h-14 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-xl shadow-sm flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            aria-label="Erase"
          >
            <Trash2 size={20} />
        </button>
      </div>

    </div>
  );
}
