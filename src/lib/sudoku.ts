import { seededNumber, seededShuffle } from "./challenge-seed";

// --- 6x6 Sudoku Generator ---
export function generateSudoku(difficulty: 'easy' | 'medium' | 'hard' = 'medium', seed: string = 'sudoku') {
  let randomIndex = 0;
  const random = () => seededNumber(seed, `random:${randomIndex++}`, 1_000_000) / 1_000_000;
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

  const shuffle = <T,>(array: T[]): T[] => { const copy = seededShuffle(array, seed, `shuffle:${randomIndex++}`); array.splice(0, array.length, ...copy); return array; };

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
  if (random() > 0.5) swapRows(0, 1);
  if (random() > 0.5) swapRows(2, 3);
  if (random() > 0.5) swapRows(4, 5);

  // 3. Shuffle bands (swap band 0 and 1, etc.)
  const bands = [0, 1, 2];
  shuffle(bands);
  const newBoardRows = [];
  for (const b of bands) {
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
  if (random() > 0.5) {
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
  if (difficulty === 'easy') cellsToRemove = Math.floor(random() * 3) + 12; // 12-14
  else if (difficulty === 'medium') cellsToRemove = Math.floor(random() * 3) + 16; // 16-18
  else if (difficulty === 'hard') cellsToRemove = Math.floor(random() * 3) + 20; // 20-22

  let removed = 0;
  const puzzle = board.map(row => [...row]) as (number | null)[][];

  let attempts = 0;
  while (removed < cellsToRemove && attempts < 100) {
    const r = Math.floor(random() * 6);
    const c = Math.floor(random() * 6);
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
