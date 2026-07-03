export type PlayerMark = 'X' | 'O' | null;

export const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function checkWinner(board: PlayerMark[]): PlayerMark {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function isBoardFull(board: PlayerMark[]): boolean {
  return board.every((cell) => cell !== null);
}

export function getWinningCombo(board: PlayerMark[]): number[] | null {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return combo;
    }
  }
  return null;
}

/**
 * Unbeatable Minimax AI with Alpha-Beta pruning for optimal Tic-Tac-Toe moves.
 */
export function getBestMove(board: PlayerMark[], aiMark: PlayerMark = 'O', humanMark: PlayerMark = 'X'): number {
  // First turn quick heuristics for performance & variety
  const availableIndices = board
    .map((val, idx) => (val === null ? idx : null))
    .filter((val): val is number => val !== null);

  if (availableIndices.length === 9) {
    // If AI goes first on an empty board, pick center or corner
    const starters = [0, 2, 4, 6, 8];
    return starters[Math.floor(Math.random() * starters.length)];
  }

  let bestScore = -Infinity;
  let bestMoves: number[] = [];

  for (const idx of availableIndices) {
    board[idx] = aiMark;
    const score = minimax(board, 0, false, -Infinity, Infinity, aiMark, humanMark);
    board[idx] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [idx];
    } else if (score === bestScore) {
      bestMoves.push(idx);
    }
  }

  // If multiple equally optimal moves exist, pick center if available or random optimal
  if (bestMoves.includes(4)) {
    return 4;
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function minimax(
  board: PlayerMark[],
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiMark: PlayerMark,
  humanMark: PlayerMark
): number {
  const winner = checkWinner(board);
  if (winner === aiMark) return 10 - depth;
  if (winner === humanMark) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiMark;
        const evalScore = minimax(board, depth + 1, false, alpha, beta, aiMark, humanMark);
        board[i] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = humanMark;
        const evalScore = minimax(board, depth + 1, true, alpha, beta, aiMark, humanMark);
        board[i] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
}
