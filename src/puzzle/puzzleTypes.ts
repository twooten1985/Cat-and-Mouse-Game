export type AppVersion = 'maze' | 'puzzle';

export type PuzzleGameId = 'mastermind' | 'memory' | 'sudoku';

export type PuzzleDifficulty = 'easy' | 'normal' | 'hard';

export interface PuzzleMatchResult {
  puzzleId: PuzzleGameId;
  winner: 1 | 2 | 'DRAW' | 'SOLO_WIN' | 'SOLO_LOSS';
  p1Score: number;
  p2Score: number;
  summary: string;
}
