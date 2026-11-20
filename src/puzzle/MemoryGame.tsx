import React, { useEffect, useState } from 'react';
import {
  BrickWall,
  Crown,
  Droplets,
  Fish,
  Flame,
  Ghost,
  Heart,
  PawPrint,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { CatPreview } from '../components/CatPreview';
import { PlayerProfile } from '../types/game';
import { soundEngine } from '../utils/sound';
import { PuzzleDifficulty } from './puzzleTypes';

interface CardTheme {
  pairId: string;
  label: string;
  color: string;
  renderIcon: () => React.ReactNode;
}

const CARD_THEMES: CardTheme[] = [
  {
    pairId: 'giant_cat',
    label: 'Giant Orb',
    color: '#FBBF24',
    renderIcon: () => <Crown className="h-6 w-6 text-amber-400" />,
  },
  {
    pairId: 'ghost_cat',
    label: 'Ghost Cat',
    color: '#38BDF8',
    renderIcon: () => <Ghost className="h-6 w-6 text-sky-400" />,
  },
  {
    pairId: 'sticky_paws',
    label: 'Sticky Paws',
    color: '#E879F9',
    renderIcon: () => <Droplets className="h-6 w-6 text-fuchsia-400" />,
  },
  {
    pairId: 'zoomies',
    label: 'Zoomies',
    color: '#34D399',
    renderIcon: () => <Zap className="h-6 w-6 text-emerald-400" />,
  },
  {
    pairId: 'kibble_fish',
    label: 'Gold Fish',
    color: '#60A5FA',
    renderIcon: () => <Fish className="h-6 w-6 text-blue-400" />,
  },
  {
    pairId: 'brick_smash',
    label: 'Wall Smash',
    color: '#FB923C',
    renderIcon: () => <BrickWall className="h-6 w-6 text-orange-400" />,
  },
  {
    pairId: 'chase_heat',
    label: '5x Chase',
    color: '#FDE047',
    renderIcon: () => <Flame className="h-6 w-6 text-yellow-300" />,
  },
  {
    pairId: 'cat_paw',
    label: 'Velvet Paw',
    color: '#F472B6',
    renderIcon: () => <PawPrint className="h-6 w-6 text-pink-400" />,
  },
  {
    pairId: 'cat_life',
    label: 'Extra Life',
    color: '#FB7185',
    renderIcon: () => <Heart className="h-6 w-6 text-rose-400" />,
  },
  {
    pairId: 'catnip',
    label: 'Catnip',
    color: '#A78BFA',
    renderIcon: () => <Sparkles className="h-6 w-6 text-violet-400" />,
  },
  {
    pairId: 'trophy',
    label: 'Cup',
    color: '#FACC15',
    renderIcon: () => <Trophy className="h-6 w-6 text-yellow-400" />,
  },
  {
    pairId: 'cheddar',
    label: 'Mighty',
    color: '#2DD4BF',
    renderIcon: () => <Crown className="h-6 w-6 text-teal-400" />,
  },
];

interface MemoryCard {
  uid: number;
  theme: CardTheme;
  matchedBy: 0 | 1 | 2;
}

function buildDeck(pairCount: number): MemoryCard[] {
  const chosen = CARD_THEMES.slice(0, pairCount);
  const raw: MemoryCard[] = [];
  let uid = 0;
  for (const theme of chosen) {
    raw.push({ uid: uid++, theme, matchedBy: 0 });
    raw.push({ uid: uid++, theme, matchedBy: 0 });
  }
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw;
}

interface MemoryGameProps {
  playerCount: 1 | 2;
  profiles: [PlayerProfile, PlayerProfile];
  difficulty: PuzzleDifficulty;
  onRecordWin: (winner: 1 | 2 | 'DRAW', p1Score: number, p2Score: number) => void;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({
  playerCount,
  profiles,
  difficulty,
  onRecordWin,
}) => {
  const pairCount = difficulty === 'easy' ? 6 : difficulty === 'normal' ? 8 : 12;

  const [cards, setCards] = useState<MemoryCard[]>(() => buildDeck(pairCount));
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);

  const resetBoard = (nextPairs = pairCount) => {
    soundEngine.playGameStart();
    setCards(buildDeck(nextPairs));
    setFlippedIndices([]);
    setLocked(false);
    setActivePlayer(1);
    setScores([0, 0]);
    setStreak(0);
    setMoves(0);
    setCompleted(false);
  };

  useEffect(() => {
    setCards(buildDeck(pairCount));
    setFlippedIndices([]);
    setLocked(false);
    setActivePlayer(1);
    setScores([0, 0]);
    setStreak(0);
    setMoves(0);
    setCompleted(false);
  }, [pairCount]);

  const handleCardClick = (index: number) => {
    if (locked || completed) return;
    if (cards[index].matchedBy !== 0) return;
    if (flippedIndices.includes(index)) return;

    soundEngine.playMenuClick();
    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [i1, i2] = nextFlipped;
      const c1 = cards[i1];
      const c2 = cards[i2];

      if (c1.theme.pairId === c2.theme.pairId) {
        const nextStreak = streak + 1;
        const pts = 100 * nextStreak;
        const nextScores: [number, number] = [...scores] as [number, number];
        nextScores[activePlayer - 1] += pts;

        setTimeout(() => {
          soundEngine.playSquashMouse(nextStreak);
          const updated = cards.map((card, idx) =>
            idx === i1 || idx === i2
              ? { ...card, matchedBy: activePlayer }
              : card
          );
          setCards(updated);
          setScores(nextScores);
          setStreak(nextStreak);
          setFlippedIndices([]);
          setLocked(false);

          if (updated.every((c) => c.matchedBy !== 0)) {
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
          }
        }, 320);
      } else {
        setTimeout(() => {
          soundEngine.playWallCrack();
          setFlippedIndices([]);
          setStreak(0);
          setLocked(false);
          if (playerCount === 2) {
            setActivePlayer((p) => (p === 1 ? 2 : 1));
          }
        }, 760);
      }
    }
  };

  const gridColsClass =
    pairCount === 12
      ? 'grid-cols-4 sm:grid-cols-6'
      : 'grid-cols-4';

  const winnerNum =
    scores[0] > scores[1] ? 1 : scores[1] > scores[0] ? 2 : 'DRAW';

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
      {/* Top Scoreboard & Turn Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2B3554] bg-[#12172A] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {(playerCount === 2 ? [0, 1] : [0]).map((idx) => {
            const p = profiles[idx];
            const isTurn = !completed && activePlayer === idx + 1;
            return (
              <div
                key={p.playerNumber}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                  isTurn
                    ? 'border-amber-400 bg-[#19223E]'
                    : 'border-[#2B3554] bg-[#090B14]'
                }`}
              >
                <CatPreview
                  skin={p.skin}
                  playerNumber={p.playerNumber}
                  size={36}
                />
                <div>
                  <div
                    className="font-arcade text-xs"
                    style={{ color: p.skin.primaryColor }}
                  >
                    P{p.playerNumber} {p.name}
                  </div>
                  <div className="font-mono text-sm font-bold text-white tabular-nums">
                    {scores[idx].toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs text-slate-400 tabular-nums">
            <div className="font-arcade text-amber-400">
              {streak > 1 ? `${streak}x Combo` : 'Memory Match'}
            </div>
            <div>{moves} Turns</div>
          </div>

          <button
            type="button"
            onClick={() => resetBoard()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2B3554] bg-[#090B14] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/60 hover:text-amber-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Shuffle
          </button>
        </div>
      </div>

      {/* Card Grid */}
      <div className={`grid gap-2.5 sm:gap-3 ${gridColsClass}`}>
        {cards.map((card, idx) => {
          const isFlipped =
            flippedIndices.includes(idx) || card.matchedBy !== 0;
          const ownerColor =
            card.matchedBy > 0
              ? profiles[card.matchedBy - 1].skin.primaryColor
              : undefined;

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(idx)}
              disabled={isFlipped || locked}
              style={
                card.matchedBy > 0 && ownerColor
                  ? { borderColor: ownerColor }
                  : undefined
              }
              className={`flex min-h-[82px] sm:min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-2 transition-all duration-150 ${
                card.matchedBy > 0
                  ? 'bg-[#161E36] opacity-90'
                  : isFlipped
                  ? 'border-amber-400 bg-[#19223E]'
                  : 'border-[#2B3554] bg-[#12172A] hover:border-slate-400 active:scale-95'
              }`}
              aria-label={isFlipped ? card.theme.label : 'Hidden memory card'}
            >
              {isFlipped ? (
                <>
                  {card.theme.renderIcon()}
                  <span className="font-arcade text-[10px] text-slate-200">
                    {card.theme.label}
                  </span>
                </>
              ) : (
                <PawPrint className="h-6 w-6 text-slate-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Completion Banner */}
      {completed && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-amber-400 bg-[#12172A] p-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-amber-400" />
            <div>
              <div className="font-arcade text-sm text-white">
                {playerCount === 1
                  ? `${profiles[0].name} Matched All ${pairCount} Pairs!`
                  : winnerNum === 'DRAW'
                  ? 'Tie Memory Match!'
                  : `${profiles[winnerNum - 1].name} Wins the Memory Match!`}
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                Completed in {moves} turns
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => resetBoard()}
            className="font-arcade inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
