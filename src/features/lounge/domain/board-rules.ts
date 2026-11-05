export function ticTacToeWinner(board: string) {
  for (const [a, b, c] of [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]) {
    if (board[a] !== "-" && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return null;
}

export function connectFourWinner(board: string[], token: string) {
  const width = 7,
    height = 6,
    directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
  for (let row = 0; row < height; row++)
    for (let col = 0; col < width; col++) {
      if (board[row * width + col] !== token) continue;
      for (const [dc, dr] of directions) {
        let count = 1;
        for (let step = 1; step < 4; step++) {
          const r = row + dr * step,
            c = col + dc * step;
          if (
            r < 0 ||
            r >= height ||
            c < 0 ||
            c >= width ||
            board[r * width + c] !== token
          )
            break;
          count++;
        }
        if (count === 4) return true;
      }
    }
  return false;
}

export function winningCells(
  board: string,
  width: number,
  needed: number,
): number[] {
  const height = board.length / width;
  for (let row = 0; row < height; row++)
    for (let col = 0; col < width; col++) {
      const token = board[row * width + col];
      if (token === "-") continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1],
      ]) {
        const cells: number[] = [];
        for (let i = 0; i < needed; i++) {
          const x = col + i * dx,
            y = row + i * dy;
          if (
            x < 0 ||
            x >= width ||
            y < 0 ||
            y >= height ||
            board[y * width + x] !== token
          )
            break;
          cells.push(y * width + x);
        }
        if (cells.length === needed) return cells;
      }
    }
  return [];
}
