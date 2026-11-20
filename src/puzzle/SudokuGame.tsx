import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Eraser,
  Lightbulb,
  Pencil,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { CatPreview } from '../components/CatPreview';
import { PlayerProfile } from '../types/game';
import { soundEngine } from '../utils/sound';
import { PuzzleDifficulty } from './puzzleTypes';

interface SudokuPuzzleData {
  size: 6 | 9;
  boxRows: number;
  boxCols: number;
  solution: number[][];
  puzzle: number[][];
}

function generateSudoku(
  size: 6 | 9,
  difficulty: PuzzleDifficulty
): SudokuPuzzleData {
  const boxRows = size === 6 ? 2 : 3;
  const boxCols = 3;

  const board: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(0)
  );

  const isValid = (r: number, c: number, num: number): boolean => {
    for (let i = 0; i < size; i++) {
      if (board[r][i] === num || board[i][c] === num) return false;
    }
    const br = Math.floor(r / boxRows) * boxRows;
    const bc = Math.floor(c / boxCols) * boxCols;
    for (let rr = 0; rr < boxRows; rr++) {
      for (let cc = 0; cc < boxCols; cc++) {
        if (board[br + rr][bc + cc] === num) return false;
      }
    }
    return true;
  };

  const shuffledDigits = () => {
    const arr = Array.from({ length: size }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const solve = (pos: number): boolean => {
    if (pos === size * size) return true;
    const r = Math.floor(pos / size);
    const c = pos % size;
    for (const num of shuffledDigits()) {
      if (isValid(r, c, num)) {
        board[r][c] = num;
        if (solve(pos + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  };

  solve(0);

  const solution = board.map((row) => [...row]);
  const puzzle = board.map((row) => [...row]);

  const totalCells = size * size;
  const removeTarget =
    size === 6
      ? difficulty === 'easy'
        ? 14
        : difficulty === 'normal'
        ? 18
        : 22
      : difficulty === 'easy'
      ? 36
      : difficulty === 'normal'
      ? 45
      : 53;

  const coords: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      coords.push([r, c]);
    }
  }
  for (let i = coords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [coords[i], coords[j]] = [coords[j], coords[i]];
  }

  let removed = 0;
  for (const [r, c] of coords) {
    if (removed >= Math.min(removeTarget, totalCells - size)) break;
    puzzle[r][c] = 0;
    removed++;
  }

  return { size, boxRows, boxCols, solution, puzzle };
}

interface SudokuGameProps {
  playerCount: 1 | 2;
  profiles: [PlayerProfile, PlayerProfile];
  difficulty: PuzzleDifficulty;
  onRecordWin: (winner: 1 | 2 | 'DRAW', p1Score: number, p2Score: number) => void;
}

export const SudokuGame: React.FC<SudokuGameProps> = ({
  playerCount,
  profiles,
  difficulty,
  onRecordWin,
}) => {
  const [boardSize, setBoardSize] = useState<6 | 9>(6);
  const [data, setData] = useState<SudokuPuzzleData>(() =>
    generateSudoku(6, difficulty)
  );
  const [grid, setGrid] = useState<number[][]>(() =>
    data.puzzle.map((r) => [...r])
  );
  const [owners, setOwners] = useState<(0 | 1 | 2)[][]>(() =>
    data.puzzle.map((r) => r.map(() => 0))
  );
  const [notes, setNotes] = useState<number[][][]>(() =>
    Array.from({ length: data.size }, () =>
      Array.from({ length: data.size }, () => [])
    )
  );
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [wrongCell, setWrongCell] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  const startFresh = useCallback(
    (nextSize: 6 | 9 = boardSize, nextDiff: PuzzleDifficulty = difficulty) => {
      const fresh = generateSudoku(nextSize, nextDiff);
      setData(fresh);
      setGrid(fresh.puzzle.map((r) => [...r]));
      setOwners(fresh.puzzle.map((r) => r.map(() => 0)));
      setNotes(
        Array.from({ length: fresh.size }, () =>
          Array.from({ length: fresh.size }, () => [])
        )
      );
      setSelected(null);
      setWrongCell(null);
      setMistakes(0);
      setActivePlayer(1);
      setScores([0, 0]);
      setStreak(0);
      setCompleted(false);
    },
    [boardSize, difficulty]
  );

  useEffect(() => {
    startFresh(boardSize, difficulty);
  }, [boardSize, difficulty, startFresh]);

  const placeDigit = useCallback(
    (num: number) => {
      if (completed || !selected) return;
      const [r, c] = selected;
      if (data.puzzle[r][c] !== 0 || grid[r][c] === data.solution[r][c]) return;
      if (num < 1 || num > data.size) return;

      if (notesMode) {
        soundEngine.playMenuClick();
        setNotes((prev) => {
          const next = prev.map((row) => row.map((cell) => [...cell]));
          const cellNotes = next[r][c];
          const idx = cellNotes.indexOf(num);
          if (idx === -1) cellNotes.push(num);
          else cellNotes.splice(idx, 1);
          cellNotes.sort((a, b) => a - b);
          return next;
        });
        return;
      }

      if (data.solution[r][c] === num) {
        const nextStreak = streak + 1;
        const pts = (playerCount === 2 ? 75 : 50) + nextStreak * 15;
        const nextScores: [number, number] = [...scores] as [number, number];
        nextScores[activePlayer - 1] += pts;

        const nextGrid = grid.map((row) => [...row]);
        nextGrid[r][c] = num;
        const nextOwners = owners.map((row) => [...row]);
        nextOwners[r][c] = activePlayer;

        setGrid(nextGrid);
        setOwners(nextOwners);
        setWrongCell(null);
        setScores(nextScores);
        setStreak(nextStreak);
        setNotes((prev) => {
          const next = prev.map((row) => row.map((cell) => [...cell]));
          next[r][c] = [];
          return next;
        });

        // Check completion
        const allFilled = nextGrid.every((row, rr) =>
          row.every((val, cc) => val === data.solution[rr][cc])
        );
        if (allFilled) {
          soundEngine.playRoundWin();
          setCompleted(true);
          if (playerCount === 1) {
            onRecordWin(1, nextScores[0], 0);
          } else {
            const w =
              nextScores[0] > nextScores[1]
                ? 1
                : nextScores[1] > nextScores[0]
                ? 2
                : 'DRAW';
            onRecordWin(w, nextScores[0], nextScores[1]);
          }
        } else {
          soundEngine.playPellet();
          if (playerCount === 2) {
            setActivePlayer((p) => (p === 1 ? 2 : 1));
          }
        }
      } else {
        soundEngine.playCatHit();
        setMistakes((m) => m + 1);
        setStreak(0);
        setWrongCell([r, c]);
        setScores((prev) => {
          const next: [number, number] = [...prev] as [number, number];
          next[activePlayer - 1] = Math.max(0, next[activePlayer - 1] - 25);
          return next;
        });
        if (playerCount === 2) {
          setActivePlayer((p) => (p === 1 ? 2 : 1));
        }
      }
    },
    [
      activePlayer,
      completed,
      data.puzzle,
      data.size,
      data.solution,
      grid,
      notesMode,
      onRecordWin,
      owners,
      playerCount,
      scores,
      selected,
      streak,
    ]
  );

  const handleClear = useCallback(() => {
    if (completed || !selected) return;
    const [r, c] = selected;
    if (data.puzzle[r][c] !== 0) return;
    soundEngine.playMenuClick();
    setWrongCell(null);
    setNotes((prev) => {
      const next = prev.map((row) => row.map((cell) => [...cell]));
      next[r][c] = [];
      return next;
    });
  }, [completed, data.puzzle, selected]);

  const handleHint = () => {
    if (completed) return;
    const empties: [number, number][] = [];
    for (let r = 0; r < data.size; r++) {
      for (let c = 0; c < data.size; c++) {
        if (grid[r][c] === 0) empties.push([r, c]);
      }
    }
    if (empties.length === 0) return;

    const target =
      selected && grid[selected[0]][selected[1]] === 0
        ? selected
        : empties[Math.floor(Math.random() * empties.length)];
    const [hr, hc] = target;

    soundEngine.playGiantPowerUp();
    const nextGrid = grid.map((row) => [...row]);
    nextGrid[hr][hc] = data.solution[hr][hc];
    setGrid(nextGrid);
    setSelected([hr, hc]);
    setWrongCell(null);
    setScores((prev) => {
      const next: [number, number] = [...prev] as [number, number];
      next[activePlayer - 1] = Math.max(0, next[activePlayer - 1] - 40);
      return next;
    });

    const allFilled = nextGrid.every((row, rr) =>
      row.every((val, cc) => val === data.solution[rr][cc])
    );
    if (allFilled) {
      soundEngine.playRoundWin();
      setCompleted(true);
      if (playerCount === 1) {
        onRecordWin(1, scores[0], 0);
      } else {
        const w =
          scores[0] > scores[1] ? 1 : scores[1] > scores[0] ? 2 : 'DRAW';
        onRecordWin(w, scores[0], scores[1]);
      }
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const n = Number(e.key);
      if (n >= 1 && n <= data.size) {
        placeDigit(n);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleClear();
      } else if (selected) {
        const [r, c] = selected;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelected([Math.max(0, r - 1), c]);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelected([Math.min(data.size - 1, r + 1), c]);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelected([r, Math.max(0, c - 1)]);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSelected([r, Math.min(data.size - 1, c + 1)]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data.size, handleClear, placeDigit, selected]);

  const selectedVal = selected ? grid[selected[0]][selected[1]] : 0;
  const winnerNum =
    scores[0] > scores[1] ? 1 : scores[1] > scores[0] ? 2 : 'DRAW';

  return (
    <div className="mx-auto grid w-full max-w-[1040px] gap-5 lg:grid-cols-[1fr_320px]">
      {/* Left: Sudoku Grid */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 sm:p-5">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-[#2B3554] pb-3">
          <div>
            <h2 className="font-arcade text-base sm:text-lg text-amber-400">
              Cat-O-Ku ({boardSize}×{boardSize})
            </h2>
            <p className="text-xs text-slate-400">
              {playerCount === 1
                ? 'Fill every row, column, and box without repeating digits'
                : 'Take turns claiming cells — valid digits earn points'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-[#090B14] p-1">
              {([6, 9] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick();
                    setBoardSize(sz);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    boardSize === sz
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {sz}×{sz}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playGameStart();
                startFresh(boardSize, difficulty);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2B3554] bg-[#090B14] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-amber-400/60 hover:text-amber-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Grid
            </button>
          </div>
        </div>

        {/* Grid Container */}
        <div
          className="grid w-full max-w-[490px] overflow-hidden rounded-xl border-2 border-amber-400/70 bg-[#090B14]"
          style={{
            gridTemplateColumns: `repeat(${data.size}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row, r) =>
            row.map((val, c) => {
              const isGiven = data.puzzle[r][c] !== 0;
              const isSelected =
                selected?.[0] === r && selected?.[1] === c;
              const isSameRowOrCol =
                selected && (selected[0] === r || selected[1] === c);
              const isSameDigit = selectedVal !== 0 && val === selectedVal;
              const isWrong =
                wrongCell?.[0] === r && wrongCell?.[1] === c;
              const owner = owners[r][c];
              const cellNotes = notes[r][c];

              const thickRight =
                (c + 1) % data.boxCols === 0 && c !== data.size - 1;
              const thickBottom =
                (r + 1) % data.boxRows === 0 && r !== data.size - 1;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick();
                    setSelected([r, c]);
                  }}
                  className={`relative flex aspect-square items-center justify-center border-r border-b border-[#1E263D] transition-colors ${
                    thickRight ? 'border-r-2 border-r-amber-400/60' : ''
                  } ${
                    thickBottom ? 'border-b-2 border-b-amber-400/60' : ''
                  } ${
                    isWrong
                      ? 'bg-rose-500/25 ring-2 ring-inset ring-rose-400'
                      : isSelected
                      ? 'bg-amber-500/25 ring-2 ring-inset ring-amber-400'
                      : isSameDigit
                      ? 'bg-sky-500/20'
                      : isSameRowOrCol
                      ? 'bg-[#161E36]'
                      : 'bg-[#090B14]'
                  }`}
                >
                  {val !== 0 ? (
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        boardSize === 6
                          ? 'text-xl sm:text-2xl'
                          : 'text-base sm:text-xl'
                      } ${isGiven ? 'text-slate-100' : ''}`}
                      style={
                        !isGiven && owner > 0
                          ? { color: profiles[owner - 1].skin.primaryColor }
                          : !isGiven
                          ? { color: '#FBBF24' }
                          : undefined
                      }
                    >
                      {val}
                    </span>
                  ) : cellNotes.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0.5 p-0.5 text-[9px] leading-none text-slate-400 font-mono">
                      {cellNotes.slice(0, 6).map((n) => (
                        <span key={n}>{n}</span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Scoreboard, Number Pad & Tools */}
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {playerCount === 1
                ? 'Solo Run'
                : completed
                ? 'Final Score'
                : `Turn: P${activePlayer} ${profiles[activePlayer - 1].name}`}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              {mistakes} Mistakes
            </span>
          </div>

          <div
            className={`grid gap-2.5 ${
              playerCount === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {(playerCount === 2 ? [0, 1] : [0]).map((idx) => {
              const p = profiles[idx];
              const isTurn = !completed && activePlayer === idx + 1;
              return (
                <div
                  key={p.playerNumber}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                    isTurn
                      ? 'border-amber-400 bg-[#19223E]'
                      : 'border-[#2B3554] bg-[#090B14]'
                  }`}
                >
                  <CatPreview
                    skin={p.skin}
                    playerNumber={p.playerNumber}
                    size={38}
                  />
                  <div className="min-w-0">
                    <div
                      className="font-arcade text-[11px] truncate"
                      style={{ color: p.skin.primaryColor }}
                    >
                      P{p.playerNumber} {p.name}
                    </div>
                    <div className="font-mono text-base font-bold text-white tabular-nums">
                      {scores[idx].toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Touch & Click Number Pad */}
        <div className="rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300">
              Number Pad
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuClick();
                setNotesMode((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                notesMode
                  ? 'border-amber-400 bg-amber-500 text-slate-950'
                  : 'border-[#2B3554] bg-[#090B14] text-slate-300 hover:text-white'
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Notes {notesMode ? 'On' : 'Off'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: data.size }).map((_, i) => {
              const num = i + 1;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={completed || !selected}
                  onClick={() => placeDigit(num)}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-[#2B3554] bg-[#090B14] font-mono text-lg font-bold text-slate-100 transition-colors hover:border-amber-400 hover:text-amber-300 active:scale-95 disabled:opacity-40"
                >
                  {num}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={completed || !selected}
              onClick={handleClear}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#2B3554] bg-[#090B14] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-40"
            >
              <Eraser className="h-4 w-4" />
              Clear Cell
            </button>
            <button
              type="button"
              disabled={completed}
              onClick={handleHint}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-amber-400/60 bg-[#161E36] px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40"
            >
              <Lightbulb className="h-4 w-4" />
              Hint (-40)
            </button>
          </div>
        </div>

        {completed && (
          <div className="rounded-2xl border-2 border-amber-400 bg-[#12172A] p-4 text-center">
            <Trophy className="mx-auto h-7 w-7 text-amber-400" />
            <div className="font-arcade mt-1.5 text-sm text-white">
              {playerCount === 1
                ? `${profiles[0].name} Solved Cat-O-Ku!`
                : winnerNum === 'DRAW'
                ? 'Tie Sudoku Match!'
                : `${profiles[winnerNum - 1].name} Wins Cat-O-Ku!`}
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playGameStart();
                startFresh(boardSize, difficulty);
              }}
              className="font-arcade mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
