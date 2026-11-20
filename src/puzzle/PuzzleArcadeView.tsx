import React, { useState } from 'react';
import { Grid3X3, KeyRound, Layers, Volume2, VolumeX } from 'lucide-react';
import { PlayerProfile } from '../types/game';
import { soundEngine } from '../utils/sound';
import { MastermindGame } from './MastermindGame';
import { MemoryGame } from './MemoryGame';
import { PuzzleDifficulty, PuzzleGameId } from './puzzleTypes';
import { SudokuGame } from './SudokuGame';

interface PuzzleArcadeViewProps {
  profiles: [PlayerProfile, PlayerProfile];
  playerCount: 1 | 2;
  isMuted: boolean;
  onChangePlayerCount: (count: 1 | 2) => void;
  onToggleMute: () => void;
  onSwitchToMaze: () => void;
  onRecordWin: (winner: 1 | 2 | 'DRAW', p1Score: number, p2Score: number) => void;
}

const PUZZLE_TABS: {
  id: PuzzleGameId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'mastermind',
    title: 'Mastermind',
    subtitle: 'Crack the Mouse Vault code',
    icon: <KeyRound className="h-4 w-4" />,
  },
  {
    id: 'memory',
    title: 'Memory Match',
    subtitle: 'Flip pairs & build combos',
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: 'sudoku',
    title: 'Cat-O-Ku',
    subtitle: '6×6 & 9×9 logic grids',
    icon: <Grid3X3 className="h-4 w-4" />,
  },
];

export const PuzzleArcadeView: React.FC<PuzzleArcadeViewProps> = ({
  profiles,
  playerCount,
  isMuted,
  onChangePlayerCount,
  onToggleMute,
  onSwitchToMaze,
  onRecordWin,
}) => {
  const [activePuzzle, setActivePuzzle] = useState<PuzzleGameId>('mastermind');
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>('normal');

  return (
    <div className="min-h-screen bg-[#090B14] text-slate-100">
      {/* Clean 3-Zone Top Bar */}
      <header className="border-b border-[#2B3554] bg-[#0D111E]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 py-4">
          <span className="font-arcade text-base sm:text-lg tracking-wider text-amber-400 whitespace-nowrap shrink-0">
            WHISKER PUZZLES
          </span>

          <nav className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-medium text-slate-300">
            {PUZZLE_TABS.map((tab) => {
              const active = activePuzzle === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick();
                    setActivePuzzle(tab.id);
                  }}
                  className={`inline-flex items-center gap-1.5 border-b-2 pb-1 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.title}
                </button>
              );
            })}

            <button
              type="button"
              onClick={onToggleMute}
              className="hidden sm:inline-flex items-center gap-1.5 text-slate-300 transition-colors hover:text-white whitespace-nowrap shrink-0"
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              )}
              {isMuted ? 'Sound Off' : 'Sound On'}
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuClick();
                onSwitchToMaze();
              }}
              className="font-arcade rounded-lg border border-amber-400/70 bg-[#161E36] px-3.5 py-2 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500 hover:text-slate-950 whitespace-nowrap shrink-0"
            >
              Play Maze Chase
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 px-4 sm:px-6 py-6">
        {/* Compact Puzzle Controls Strip */}
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2B3554] bg-[#12172A] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-[#090B14] p-1">
              {([1, 2] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick();
                    onChangePlayerCount(cnt);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    playerCount === cnt
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cnt === 1 ? '1 Player' : '2 Players'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-[#090B14] p-1">
              {(['easy', 'normal', 'hard'] as PuzzleDifficulty[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick();
                    setDifficulty(lvl);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                    difficulty === lvl
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400">
            {PUZZLE_TABS.find((t) => t.id === activePuzzle)?.subtitle} ·{' '}
            {playerCount === 1 ? 'Solo Challenge' : 'Turn-Based Duel'}
          </div>
        </div>

        {/* Active Puzzle Board */}
        {activePuzzle === 'mastermind' && (
          <MastermindGame
            playerCount={playerCount}
            profiles={profiles}
            difficulty={difficulty}
            onRecordWin={onRecordWin}
          />
        )}

        {activePuzzle === 'memory' && (
          <MemoryGame
            playerCount={playerCount}
            profiles={profiles}
            difficulty={difficulty}
            onRecordWin={onRecordWin}
          />
        )}

        {activePuzzle === 'sudoku' && (
          <SudokuGame
            playerCount={playerCount}
            profiles={profiles}
            difficulty={difficulty}
            onRecordWin={onRecordWin}
          />
        )}
      </main>
    </div>
  );
};
