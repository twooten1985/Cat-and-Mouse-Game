import React, { useMemo, useState } from 'react';
import {
  Check,
  Crown,
  Delete,
  Fish,
  HelpCircle,
  PawPrint,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { CatPreview } from '../components/CatPreview';
import { PlayerProfile } from '../types/game';
import { soundEngine } from '../utils/sound';
import { PuzzleDifficulty } from './puzzleTypes';

interface MastermindToken {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  symbol: string;
}

const ALL_TOKENS: MastermindToken[] = [
  { id: 'fish', label: 'Fish', color: '#38BDF8', bgClass: 'bg-sky-500', symbol: 'F' },
  { id: 'cheese', label: 'Cheese', color: '#FBBF24', bgClass: 'bg-amber-400', symbol: 'C' },
  { id: 'paw', label: 'Paw', color: '#F472B6', bgClass: 'bg-pink-400', symbol: 'P' },
  { id: 'yarn', label: 'Yarn', color: '#34D399', bgClass: 'bg-emerald-400', symbol: 'Y' },
  { id: 'berry', label: 'Berry', color: '#FB7185', bgClass: 'bg-rose-400', symbol: 'B' },
  { id: 'plum', label: 'Grape', color: '#A78BFA', bgClass: 'bg-violet-400', symbol: 'G' },
  { id: 'tangerine', label: 'Orange', color: '#FB923C', bgClass: 'bg-orange-400', symbol: 'O' },
  { id: 'mint', label: 'Star', color: '#2DD4BF', bgClass: 'bg-teal-400', symbol: 'S' },
];

interface GuessRow {
  guess: string[];
  exact: number;
  misplaced: number;
  playerNumber: 1 | 2;
  pointsEarned: number;
}

interface MastermindGameProps {
  playerCount: 1 | 2;
  profiles: [PlayerProfile, PlayerProfile];
  difficulty: PuzzleDifficulty;
  onRecordWin: (winner: 1 | 2 | 'DRAW', p1Score: number, p2Score: number) => void;
}

function generateSecretCode(tokenIds: string[], codeLength: number): string[] {
  const code: string[] = [];
  for (let i = 0; i < codeLength; i++) {
    code.push(tokenIds[Math.floor(Math.random() * tokenIds.length)]);
  }
  return code;
}

function evaluateGuess(
  secret: string[],
  guess: string[]
): { exact: number; misplaced: number } {
  let exact = 0;
  const secretRem: (string | null)[] = [...secret];
  const guessRem: (string | null)[] = [...guess];

  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      exact++;
      secretRem[i] = null;
      guessRem[i] = null;
    }
  }

  let misplaced = 0;
  for (let i = 0; i < guessRem.length; i++) {
    const g = guessRem[i];
    if (!g) continue;
    const matchIdx = secretRem.indexOf(g);
    if (matchIdx !== -1) {
      misplaced++;
      secretRem[matchIdx] = null;
    }
  }

  return { exact, misplaced };
}

function renderTokenIcon(id: string, className = 'h-4 w-4') {
  switch (id) {
    case 'fish':
      return <Fish className={className} />;
    case 'cheese':
      return <Crown className={className} />;
    case 'paw':
      return <PawPrint className={className} />;
    case 'yarn':
      return <Sparkles className={className} />;
    default:
      return null;
  }
}

export const MastermindGame: React.FC<MastermindGameProps> = ({
  playerCount,
  profiles,
  difficulty,
  onRecordWin,
}) => {
  const codeLength = difficulty === 'hard' ? 5 : 4;
  const maxAttempts = difficulty === 'easy' ? 10 : difficulty === 'normal' ? 9 : 10;
  const tokenCount = difficulty === 'easy' ? 5 : difficulty === 'normal' ? 6 : 8;

  const activeTokens = useMemo(
    () => ALL_TOKENS.slice(0, tokenCount),
    [tokenCount]
  );
  const tokenIds = useMemo(() => activeTokens.map((t) => t.id), [activeTokens]);

  const [secret, setSecret] = useState<string[]>(() =>
    generateSecretCode(tokenIds, codeLength)
  );
  const [rows, setRows] = useState<GuessRow[]>([]);
  const [currentGuess, setCurrentGuess] = useState<(string | null)[]>(() =>
    Array(codeLength).fill(null)
  );
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [status, setStatus] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [cracker, setCracker] = useState<1 | 2 | null>(null);

  const resetGame = (
    nextLen = codeLength,
    nextIds = tokenIds
  ) => {
    soundEngine.playGameStart();
    setSecret(generateSecretCode(nextIds, nextLen));
    setRows([]);
    setCurrentGuess(Array(nextLen).fill(null));
    setSelectedSlot(0);
    setActivePlayer(1);
    setScores([0, 0]);
    setStatus('PLAYING');
    setCracker(null);
  };

  // Reset cleanly if difficulty changes
  React.useEffect(() => {
    setSecret(generateSecretCode(tokenIds, codeLength));
    setRows([]);
    setCurrentGuess(Array(codeLength).fill(null));
    setSelectedSlot(0);
    setActivePlayer(1);
    setScores([0, 0]);
    setStatus('PLAYING');
    setCracker(null);
  }, [codeLength, tokenIds]);

  const placeToken = (tokenId: string) => {
    if (status !== 'PLAYING') return;
    soundEngine.playMenuClick();
    const next = [...currentGuess];
    next[selectedSlot] = tokenId;
    setCurrentGuess(next);

    // Advance cursor to next empty slot, or +1
    const nextEmpty = next.findIndex((v, idx) => idx > selectedSlot && v === null);
    if (nextEmpty !== -1) {
      setSelectedSlot(nextEmpty);
    } else {
      const anyEmpty = next.findIndex((v) => v === null);
      if (anyEmpty !== -1) setSelectedSlot(anyEmpty);
      else setSelectedSlot((selectedSlot + 1) % codeLength);
    }
  };

  const clearSlot = () => {
    if (status !== 'PLAYING') return;
    soundEngine.playMenuClick();
    const next = [...currentGuess];
    if (next[selectedSlot] !== null) {
      next[selectedSlot] = null;
      setCurrentGuess(next);
    } else {
      const lastFilled = [...next]
        .reverse()
        .findIndex((v) => v !== null);
      if (lastFilled !== -1) {
        const idx = codeLength - 1 - lastFilled;
        next[idx] = null;
        setCurrentGuess(next);
        setSelectedSlot(idx);
      }
    }
  };

  const submitGuess = () => {
    if (status !== 'PLAYING') return;
    if (currentGuess.some((v) => v === null)) return;

    const finalGuess = currentGuess as string[];
    const { exact, misplaced } = evaluateGuess(secret, finalGuess);
    const solved = exact === codeLength;

    const efficiencyBonus = solved ? (maxAttempts - rows.length) * 80 : 0;
    const pts = exact * 45 + misplaced * 15 + (solved ? 300 + efficiencyBonus : 0);

    const nextScores: [number, number] = [...scores] as [number, number];
    nextScores[activePlayer - 1] += pts;
    setScores(nextScores);

    const newRow: GuessRow = {
      guess: finalGuess,
      exact,
      misplaced,
      playerNumber: activePlayer,
      pointsEarned: pts,
    };
    const nextRows = [...rows, newRow];
    setRows(nextRows);
    setCurrentGuess(Array(codeLength).fill(null));
    setSelectedSlot(0);

    if (solved) {
      soundEngine.playRoundWin();
      setStatus('WON');
      setCracker(activePlayer);
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
    } else if (nextRows.length >= maxAttempts) {
      soundEngine.playCatHit();
      setStatus('LOST');
      if (playerCount === 2) {
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
  };

  const getToken = (id: string | null) =>
    ALL_TOKENS.find((t) => t.id === id) || null;

  const isGuessReady = currentGuess.every((v) => v !== null);

  return (
    <div className="mx-auto grid w-full max-w-[1040px] gap-5 lg:grid-cols-[1fr_340px]">
      {/* Left: Mastermind Decoding Board */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2B3554] pb-3">
          <div>
            <h2 className="font-arcade text-base sm:text-lg text-amber-400">
              Catnip Mastermind
            </h2>
            <p className="text-xs text-slate-400">
              Crack the {codeLength}-token Mouse Vault code in {maxAttempts}{' '}
              guesses
            </p>
          </div>

          <button
            type="button"
            onClick={() => resetGame()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2B3554] bg-[#090B14] px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Code
          </button>
        </div>

        {/* Secret Vault Header */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2B3554] bg-[#090B14] px-4 py-2.5">
          <span className="font-arcade text-xs text-slate-300">
            Mouse Vault
          </span>
          <div className="flex items-center gap-2">
            {secret.map((id, idx) => {
              const tok = getToken(id);
              const revealed = status !== 'PLAYING';
              return (
                <div
                  key={idx}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2B3554] bg-[#12172A] font-arcade text-xs text-slate-950"
                  style={
                    revealed && tok ? { backgroundColor: tok.color } : undefined
                  }
                >
                  {revealed && tok ? (
                    renderTokenIcon(tok.id) || tok.symbol
                  ) : (
                    <HelpCircle className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Guess History Rows */}
        <div className="flex flex-col gap-2">
          {Array.from({ length: maxAttempts }).map((_, rIdx) => {
            const submitted = rows[rIdx];
            const isActiveRow = status === 'PLAYING' && rIdx === rows.length;

            return (
              <div
                key={rIdx}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  isActiveRow
                    ? 'border-amber-400 bg-[#19223E]'
                    : 'border-[#1E263D] bg-[#090B14]/75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 font-mono text-xs text-slate-500 tabular-nums">
                    {rIdx + 1}.
                  </span>
                  {submitted && playerCount === 2 && (
                    <span
                      className="font-arcade text-[10px]"
                      style={{
                        color:
                          profiles[submitted.playerNumber - 1].skin
                            .primaryColor,
                      }}
                    >
                      P{submitted.playerNumber}
                    </span>
                  )}
                  {isActiveRow && playerCount === 2 && (
                    <span
                      className="font-arcade text-[10px]"
                      style={{
                        color: profiles[activePlayer - 1].skin.primaryColor,
                      }}
                    >
                      P{activePlayer}
                    </span>
                  )}
                </div>

                {/* Token Slots */}
                <div className="flex items-center gap-2">
                  {Array.from({ length: codeLength }).map((__, sIdx) => {
                    const tokId = submitted
                      ? submitted.guess[sIdx]
                      : isActiveRow
                      ? currentGuess[sIdx]
                      : null;
                    const tok = getToken(tokId);
                    const isCursor = isActiveRow && selectedSlot === sIdx;

                    return (
                      <button
                        key={sIdx}
                        type="button"
                        disabled={!isActiveRow}
                        onClick={() => isActiveRow && setSelectedSlot(sIdx)}
                        className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border-2 font-arcade text-xs transition-transform ${
                          isCursor
                            ? 'border-white ring-2 ring-amber-400/50 scale-105'
                            : 'border-[#2B3554]'
                        } ${tok ? 'text-slate-950' : 'bg-[#12172A] text-slate-600'}`}
                        style={tok ? { backgroundColor: tok.color } : undefined}
                        aria-label={`Row ${rIdx + 1} slot ${sIdx + 1}`}
                      >
                        {tok ? renderTokenIcon(tok.id) || tok.symbol : '·'}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Pegs */}
                <div className="flex min-w-[96px] items-center justify-end gap-1.5">
                  {submitted ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: submitted.exact }).map((_, i) => (
                          <span
                            key={`e-${i}`}
                            title="Exact position & token"
                            className="h-3 w-3 rounded-full bg-amber-400 ring-1 ring-amber-200"
                          />
                        ))}
                        {Array.from({ length: submitted.misplaced }).map(
                          (_, i) => (
                            <span
                              key={`m-${i}`}
                              title="Right token, wrong position"
                              className="h-3 w-3 rounded-full border border-slate-300 bg-slate-200/30"
                            />
                          )
                        )}
                        {Array.from({
                          length:
                            codeLength - submitted.exact - submitted.misplaced,
                        }).map((_, i) => (
                          <span
                            key={`x-${i}`}
                            className="h-2.5 w-2.5 rounded-full bg-slate-800"
                          />
                        ))}
                      </div>
                      <span className="mt-0.5 font-mono text-[10px] text-slate-400 tabular-nums">
                        {submitted.exact} exact · {submitted.misplaced} near
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-600">
                      {isActiveRow ? 'Active' : '—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Token Picker, Turn Scoreboard & Result */}
      <div className="flex flex-col gap-4">
        {/* Turn & Scoreboard */}
        <div className="rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 space-y-3">
          <div className="text-xs font-medium text-slate-400">
            {playerCount === 1
              ? 'Solo Score'
              : status === 'PLAYING'
              ? `Active Turn: P${activePlayer} ${
                  profiles[activePlayer - 1].name
                }`
              : 'Final Scores'}
          </div>

          <div
            className={`grid gap-2.5 ${
              playerCount === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {(playerCount === 2 ? [0, 1] : [0]).map((idx) => {
              const p = profiles[idx];
              const isTurn = status === 'PLAYING' && activePlayer === idx + 1;
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

        {/* Token Picker Controls */}
        <div className="rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 space-y-3">
          <div className="text-xs font-medium text-slate-300">
            Pick Token for Slot {selectedSlot + 1}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {activeTokens.map((tok) => (
              <button
                key={tok.id}
                type="button"
                disabled={status !== 'PLAYING'}
                onClick={() => placeToken(tok.id)}
                className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl border border-[#2B3554] px-1 py-1.5 text-slate-950 transition-transform hover:scale-105 disabled:opacity-40"
                style={{ backgroundColor: tok.color }}
              >
                {renderTokenIcon(tok.id, 'h-4 w-4') || (
                  <span className="font-arcade text-xs">{tok.symbol}</span>
                )}
                <span className="text-[10px] font-bold">{tok.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={status !== 'PLAYING'}
              onClick={clearSlot}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#2B3554] bg-[#090B14] px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-500 disabled:opacity-40"
            >
              <Delete className="h-4 w-4" />
              Clear
            </button>
            <button
              type="button"
              disabled={status !== 'PLAYING' || !isGuessReady}
              onClick={submitGuess}
              className="font-arcade inline-flex flex-[1.5] items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Check Guess
            </button>
          </div>
        </div>

        {/* Feedback Legend & Result Banner */}
        <div className="rounded-2xl border border-[#2B3554] bg-[#12172A] p-4 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400 ring-1 ring-amber-200" />
            <span>Gold Peg: Exact token &amp; exact slot (+45 pts)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full border border-slate-300 bg-slate-200/30" />
            <span>White Ring: Right token, wrong slot (+15 pts)</span>
          </div>

          {status !== 'PLAYING' && (
            <div className="mt-3 rounded-xl border border-amber-400/60 bg-[#090B14] p-3.5 text-center">
              <Trophy className="mx-auto h-6 w-6 text-amber-400" />
              <div className="font-arcade mt-1.5 text-sm text-white">
                {status === 'WON'
                  ? `${profiles[(cracker ?? 1) - 1].name} Cracked the Code!`
                  : 'Vault Locked — Out of Guesses!'}
              </div>
              <button
                type="button"
                onClick={() => resetGame()}
                className="font-arcade mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
