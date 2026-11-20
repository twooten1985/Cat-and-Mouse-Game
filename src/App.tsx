import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  BrickWall,
  Compass,
  Crown,
  Dices,
  Droplets,
  Expand,
  Flame,
  Gamepad2,
  Ghost,
  Glasses,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shrink,
  Smartphone,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { ArcadeHUD } from './components/ArcadeHUD';
import { CatPreview } from './components/CatPreview';
import { GameCanvas } from './components/GameCanvas';
import { MazeThumbnail } from './components/MazeThumbnail';
import { MobileControls } from './components/MobileControls';
import { OppositeEndsArena } from './components/OppositeEndsArena';
import { ProfileEditor } from './components/ProfileEditor';
import { loadProfiles, saveProfiles } from './data/catSkins';
import { generateBalancedMaze, MAZES } from './data/mazes';
import { PuzzleArcadeView } from './puzzle/PuzzleArcadeView';
import { AppVersion } from './puzzle/puzzleTypes';
import {
  DifficultyLevel,
  GameState,
  HUDState,
  MatchSettings,
  MazeDefinition,
  MobilePadLayout,
  PlayerProfile,
  SoloViewMode,
} from './types/game';
import { soundEngine } from './utils/sound';

const INITIAL_HUD: HUDState = {
  playerCount: 2,
  p1: {
    playerNumber: 1,
    score: 0,
    roundScore: 0,
    lives: 3,
    multiplier: 1,
    chaseHeat: 0,
    giantTimer: 0,
    speedTimer: 0,
    ghostTimer: 0,
    stickyTimer: 0,
    squashStreak: 0,
    miceSquashedThisRound: 0,
    wallsBrokenThisRound: 0,
  },
  p2: {
    playerNumber: 2,
    score: 0,
    roundScore: 0,
    lives: 3,
    multiplier: 1,
    chaseHeat: 0,
    giantTimer: 0,
    speedTimer: 0,
    ghostTimer: 0,
    stickyTimer: 0,
    squashStreak: 0,
    miceSquashedThisRound: 0,
    wallsBrokenThisRound: 0,
  },
  pelletsRemaining: 0,
  pelletsTotal: 0,
  roundNumber: 1,
  totalRounds: 3,
  p1RoundWins: 0,
  p2RoundWins: 0,
  roundTimeElapsed: 0,
  roundWinner: null,
  roundEndReason: '',
};

interface RoundSummaryData {
  winner: 1 | 2 | 'DRAW' | 'SOLO_LOSS';
  reason: string;
  p1Score: number;
  p2Score: number;
  p1RoundScore: number;
  p2RoundScore: number;
  p1MiceSquashed: number;
  p2MiceSquashed: number;
  p1WallsBroken: number;
  p2WallsBroken: number;
}

type TouchPreference = 'auto' | 'on' | 'off';

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.innerWidth < 860 ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

export default function App() {
  const [appVersion, setAppVersion] = useState<AppVersion>('maze');
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [profiles, setProfiles] = useState<[PlayerProfile, PlayerProfile]>(() =>
    loadProfiles()
  );
  const [generatedMaze, setGeneratedMaze] = useState<MazeDefinition>(() =>
    generateBalancedMaze(101)
  );
  const [settings, setSettings] = useState<MatchSettings>({
    playerCount: 2,
    mazeId: MAZES[0].id,
    totalRounds: 3,
    difficulty: 'classic',
    randomizeEachRound: false,
    soloViewMode: 'top_down',
  });
  const [activeRoundMaze, setActiveRoundMaze] = useState<MazeDefinition>(
    MAZES[0]
  );
  const [isMuted, setIsMuted] = useState(false);

  // Mobile / Phone Controls & View Mode
  const [touchPreference, setTouchPreference] =
    useState<TouchPreference>('auto');
  const [isNarrowOrTouch, setIsNarrowOrTouch] = useState<boolean>(() =>
    detectTouchDevice()
  );
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [mobilePadLayout, setMobilePadLayout] =
    useState<MobilePadLayout>('dual');
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motionStatus, setMotionStatus] = useState('');

  // Active Match State
  const [roundSessionKey, setRoundSessionKey] = useState(1);
  const [roundNumber, setRoundNumber] = useState(1);
  const [p1RoundWins, setP1RoundWins] = useState(0);
  const [p2RoundWins, setP2RoundWins] = useState(0);
  const [p1CumulativeScore, setP1CumulativeScore] = useState(0);
  const [p2CumulativeScore, setP2CumulativeScore] = useState(0);
  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const [roundSummary, setRoundSummary] = useState<RoundSummaryData | null>(
    null
  );

  // Meta Quest WebXR & Full-Screen VR State
  const [enterQuestVRFn, setEnterQuestVRFn] = useState<
    (() => Promise<void>) | null
  >(null);
  const [questVRActive, setQuestVRActive] = useState(false);
  const [questVRStatus, setQuestVRStatus] = useState('');
  const [showQuestGuide, setShowQuestGuide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowOrTouch(detectTouchDevice());
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  useEffect(() => {
    if (!questVRStatus) return;
    const t = window.setTimeout(() => setQuestVRStatus(''), 4500);
    return () => window.clearTimeout(t);
  }, [questVRStatus]);

  const requestBrowserFullscreen = useCallback(() => {
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      ) {
        void document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignore if browser or iframe restricts fullscreen
    }
  }, []);

  const exitBrowserFullscreen = useCallback(() => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  const mobileControlsEnabled =
    touchPreference === 'on' ||
    (touchPreference === 'auto' && isNarrowOrTouch);
  const showBottomMobileDeck =
    mobileControlsEnabled ||
    motionEnabled ||
    (settings.playerCount === 2 && mobilePadLayout === 'opposite_ends');

  const cycleMobilePadLayout = useCallback(() => {
    soundEngine.playMenuClick();
    setMobilePadLayout((prev) => {
      if (prev === 'dual') return 'single_p1';
      if (prev === 'single_p1') return 'opposite_ends';
      return 'dual';
    });
  }, []);

  const cycleSoloViewMode = useCallback(() => {
    soundEngine.playMenuClick();
    setSettings((s) => {
      const next: SoloViewMode =
        s.soloViewMode === 'top_down'
          ? 'first_person'
          : s.soloViewMode === 'first_person'
          ? 'vr_stereo'
          : 'top_down';
      if (next === 'vr_stereo') {
        requestBrowserFullscreen();
      } else {
        exitBrowserFullscreen();
      }
      return { ...s, soloViewMode: next };
    });
  }, [exitBrowserFullscreen, requestBrowserFullscreen]);

  const handleExitVRMode = useCallback(() => {
    soundEngine.playMenuClick();
    exitBrowserFullscreen();
    setSettings((s) => ({ ...s, soloViewMode: 'top_down' }));
  }, [exitBrowserFullscreen]);

  const handleRegisterQuestVR = useCallback(
    (fn: (() => Promise<void>) | null) => {
      setEnterQuestVRFn(() => fn);
    },
    []
  );

  const allMazes: MazeDefinition[] = [...MAZES, generatedMaze];
  const selectedMaze =
    allMazes.find((m) => m.id === settings.mazeId) || MAZES[0];

  const handleGenerateRandomMaze = () => {
    soundEngine.playMenuClick();
    const fresh = generateBalancedMaze();
    setGeneratedMaze(fresh);
    setSettings((s) => ({ ...s, mazeId: fresh.id }));
  };

  const handleProfileChange = (index: 0 | 1, updated: PlayerProfile) => {
    setProfiles((prev) => {
      const next: [PlayerProfile, PlayerProfile] =
        index === 0 ? [updated, prev[1]] : [prev[0], updated];
      saveProfiles(next);
      return next;
    });
  };

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const toggleMobileControlsInPlay = useCallback(() => {
    soundEngine.playMenuClick();
    setTouchPreference((prev) => {
      const currentlyOn =
        prev === 'on' || (prev === 'auto' && detectTouchDevice());
      return currentlyOn ? 'off' : 'on';
    });
  }, []);

  const handleToggleMotion = useCallback(async () => {
    if (motionEnabled) {
      soundEngine.playMenuClick();
      setMotionEnabled(false);
      setMotionStatus('');
      return;
    }

    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      soundEngine.playMenuClick();
      setMotionStatus(
        'No hardware gyro detected — use drag tilt circle in-game'
      );
      setMotionEnabled(true);
      return;
    }

    const orientationApi = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    // iOS Safari requires requestPermission() to run immediately inside the click gesture
    if (typeof orientationApi?.requestPermission === 'function') {
      try {
        const permission = await orientationApi.requestPermission();
        soundEngine.playMenuClick();
        if (permission !== 'granted') {
          setMotionStatus(
            inIframe
              ? 'Gyro blocked in preview iframe — open Shared URL in Safari or drag tilt pad'
              : 'Safari blocked motion — close & reopen tab to allow, or drag tilt pad'
          );
          setMotionEnabled(true);
          return;
        }
      } catch {
        soundEngine.playMenuClick();
        setMotionStatus(
          inIframe
            ? 'Gyro blocked in preview iframe — open Shared URL in Safari or drag tilt pad'
            : 'Motion permission blocked — reopen tab over HTTPS or drag tilt pad'
        );
        setMotionEnabled(true);
        return;
      }
    } else {
      soundEngine.playMenuClick();
    }

    setMotionStatus('Tilt phone to steer P1');
    setMotionEnabled(true);
  }, [motionEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === 'm' || e.key === 'M') &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleMute]);

  const startNewMatch = () => {
    soundEngine.playGameStart();
    if (settings.playerCount === 1 && settings.soloViewMode === 'vr_stereo') {
      requestBrowserFullscreen();
    }
    setActiveRoundMaze(selectedMaze);
    setRoundNumber(1);
    setP1RoundWins(0);
    setP2RoundWins(0);
    setP1CumulativeScore(0);
    setP2CumulativeScore(0);
    setRoundSummary(null);
    setRoundSessionKey((k) => k + 1);
    setGameState('PLAYING');
  };

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') {
        soundEngine.playMenuClick();
        return 'PAUSED';
      }
      if (prev === 'PAUSED') {
        soundEngine.playMenuClick();
        return 'PLAYING';
      }
      return prev;
    });
  }, []);

  const handleRoundEnd = useCallback(
    (result: RoundSummaryData) => {
      const nextP1Wins = result.winner === 1 ? p1RoundWins + 1 : p1RoundWins;
      const nextP2Wins = result.winner === 2 ? p2RoundWins + 1 : p2RoundWins;

      setP1RoundWins(nextP1Wins);
      setP2RoundWins(nextP2Wins);
      setP1CumulativeScore(result.p1Score);
      setP2CumulativeScore(result.p2Score);
      setRoundSummary(result);

      if (settings.playerCount === 1) {
        const isLastOrLoss =
          result.winner === 'SOLO_LOSS' || roundNumber >= settings.totalRounds;
        setProfiles((prev) => {
          const updated: [PlayerProfile, PlayerProfile] = [
            {
              ...prev[0],
              stats: {
                wins:
                  prev[0].stats.wins +
                  (isLastOrLoss && result.winner === 1 ? 1 : 0),
                highScore: Math.max(prev[0].stats.highScore, result.p1Score),
                miceSquashed:
                  prev[0].stats.miceSquashed + result.p1MiceSquashed,
                wallsBroken: prev[0].stats.wallsBroken + result.p1WallsBroken,
              },
            },
            prev[1],
          ];
          saveProfiles(updated);
          return updated;
        });
        setGameState(isLastOrLoss ? 'GAME_OVER' : 'ROUND_SUMMARY');
        return;
      }

      const winsNeeded = Math.ceil(settings.totalRounds / 2);
      const matchDecided =
        nextP1Wins >= winsNeeded ||
        nextP2Wins >= winsNeeded ||
        roundNumber >= settings.totalRounds;

      if (matchDecided) {
        let matchWinner: 1 | 2 | 'DRAW' = 'DRAW';
        if (nextP1Wins > nextP2Wins) matchWinner = 1;
        else if (nextP2Wins > nextP1Wins) matchWinner = 2;
        else if (result.p1Score > result.p2Score) matchWinner = 1;
        else if (result.p2Score > result.p1Score) matchWinner = 2;

        setProfiles((prev) => {
          const updated: [PlayerProfile, PlayerProfile] = [
            {
              ...prev[0],
              stats: {
                wins: prev[0].stats.wins + (matchWinner === 1 ? 1 : 0),
                highScore: Math.max(prev[0].stats.highScore, result.p1Score),
                miceSquashed:
                  prev[0].stats.miceSquashed + result.p1MiceSquashed,
                wallsBroken: prev[0].stats.wallsBroken + result.p1WallsBroken,
              },
            },
            {
              ...prev[1],
              stats: {
                wins: prev[1].stats.wins + (matchWinner === 2 ? 1 : 0),
                highScore: Math.max(prev[1].stats.highScore, result.p2Score),
                miceSquashed:
                  prev[1].stats.miceSquashed + result.p2MiceSquashed,
                wallsBroken: prev[1].stats.wallsBroken + result.p2WallsBroken,
              },
            },
          ];
          saveProfiles(updated);
          return updated;
        });

        setGameState('GAME_OVER');
      } else {
        setProfiles((prev) => {
          const updated: [PlayerProfile, PlayerProfile] = [
            {
              ...prev[0],
              stats: {
                ...prev[0].stats,
                miceSquashed:
                  prev[0].stats.miceSquashed + result.p1MiceSquashed,
                wallsBroken: prev[0].stats.wallsBroken + result.p1WallsBroken,
              },
            },
            {
              ...prev[1],
              stats: {
                ...prev[1].stats,
                miceSquashed:
                  prev[1].stats.miceSquashed + result.p2MiceSquashed,
                wallsBroken: prev[1].stats.wallsBroken + result.p2WallsBroken,
              },
            },
          ];
          saveProfiles(updated);
          return updated;
        });
        setGameState('ROUND_SUMMARY');
      }
    },
    [
      p1RoundWins,
      p2RoundWins,
      roundNumber,
      settings.playerCount,
      settings.totalRounds,
    ]
  );

  const handleNextRound = () => {
    soundEngine.playGameStart();
    if (settings.randomizeEachRound) {
      const nextFresh = generateBalancedMaze();
      setGeneratedMaze(nextFresh);
      setActiveRoundMaze(nextFresh);
    }
    setRoundNumber((r) => r + 1);
    setRoundSummary(null);
    setRoundSessionKey((k) => k + 1);
    setGameState('PLAYING');
  };

  const handleQuitToMenu = () => {
    soundEngine.playMenuClick();
    exitBrowserFullscreen();
    setGameState('TITLE_MENU');
  };

  const handlePuzzleWin = useCallback(
    (winner: 1 | 2 | 'DRAW', p1Score: number, p2Score: number) => {
      setProfiles((prev) => {
        const updated: [PlayerProfile, PlayerProfile] = [
          {
            ...prev[0],
            stats: {
              ...prev[0].stats,
              wins: prev[0].stats.wins + (winner === 1 ? 1 : 0),
              highScore: Math.max(prev[0].stats.highScore, p1Score),
            },
          },
          {
            ...prev[1],
            stats: {
              ...prev[1].stats,
              wins: prev[1].stats.wins + (winner === 2 ? 1 : 0),
              highScore: Math.max(prev[1].stats.highScore, p2Score),
            },
          },
        ];
        saveProfiles(updated);
        return updated;
      });
    },
    []
  );

  // ============================================================================
  // VERSION 2: WHISKER PUZZLES (MASTERMIND / MEMORY / SUDOKU)
  // ============================================================================
  if (appVersion === 'puzzle') {
    return (
      <PuzzleArcadeView
        profiles={profiles}
        playerCount={settings.playerCount}
        isMuted={isMuted}
        onChangePlayerCount={(count) =>
          setSettings((s) => ({ ...s, playerCount: count }))
        }
        onToggleMute={toggleMute}
        onSwitchToMaze={() => {
          setGameState('TITLE_MENU');
          setAppVersion('maze');
        }}
        onRecordWin={handlePuzzleWin}
      />
    );
  }

  // ============================================================================
  // TITLE MENU / ARCADE CABINET LOBBY
  // ============================================================================
  if (gameState === 'TITLE_MENU') {
    return (
      <div className="min-h-screen bg-[#090B14] text-slate-100">
        {/* Clean 3-Zone Top Bar */}
        <header className="border-b border-[#2B3554] bg-[#0D111E]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 py-4">
            <a
              href="#top"
              className="font-arcade text-base sm:text-lg tracking-wider text-amber-400 whitespace-nowrap shrink-0"
            >
              WHISKER MAZE
            </a>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <a
                href="#arenas"
                className="transition-colors hover:text-amber-300 whitespace-nowrap shrink-0"
              >
                Arenas
              </a>
              <a
                href="#profiles"
                className="transition-colors hover:text-amber-300 whitespace-nowrap shrink-0"
              >
                Cat Profiles
              </a>
              <a
                href="#mechanics"
                className="transition-colors hover:text-amber-300 whitespace-nowrap shrink-0"
              >
                Power-Ups
              </a>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playMenuClick();
                  setAppVersion('puzzle');
                }}
                className="text-amber-300 transition-colors hover:text-amber-200 whitespace-nowrap shrink-0"
              >
                Puzzle Version
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex items-center gap-1.5 text-slate-300 transition-colors hover:text-white whitespace-nowrap shrink-0"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                )}
                {isMuted ? 'Sound Off' : 'Sound On'}
              </button>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playMenuClick();
                  setAppVersion('puzzle');
                }}
                className="md:hidden rounded-lg border border-amber-400/70 bg-[#161E36] px-3 py-2 text-xs font-semibold text-amber-300 whitespace-nowrap shrink-0"
              >
                Puzzles
              </button>
              <button
                type="button"
                onClick={startNewMatch}
                className="font-arcade inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 sm:px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                Start Game
              </button>
            </div>
          </div>
        </header>

        <main
          id="top"
          className="mx-auto max-w-[1200px] space-y-8 px-4 sm:px-6 py-6 sm:py-8"
        >
          {/* Arcade Hero Banner & Match Setup */}
          <section className="flex flex-col justify-between gap-6 rounded-2xl border border-[#2B3554] bg-[#12172A] p-5 sm:p-7 lg:flex-row lg:items-center">
            <div className="max-w-2xl space-y-3">
              <p className="font-arcade text-xs text-amber-400">
                {settings.playerCount === 1
                  ? '1-Player Solo Arcade Chase'
                  : '2-Player Same-Screen Arcade Showdown'}
              </p>
              <h1
                className="font-arcade text-2xl leading-tight text-white sm:text-4xl"
                style={{ textWrap: 'balance' }}
              >
                {settings.playerCount === 1
                  ? 'One Cat. Four Mice. Clear the Maze.'
                  : 'Two Cats. Four Mice. Smash Walls & Squash the Pack.'}
              </h1>
              <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                {settings.playerCount === 1
                  ? settings.soloViewMode === 'top_down'
                    ? 'Play solo with WASD, Arrow Keys, or the digital joystick. Grab Giant Orbs to squash mice, phase through danger in Ghost Mode, and dodge Sticky Paws traps.'
                    : 'Dive into the maze in 3D First-Person or VR Stereo view! Hold Up/W (or touch & hold) to move forward, and press Left/Right (A/D) to turn.'
                  : 'Race head-to-head on desktop keyboards or mobile joysticks across balanced symmetrical mazes. Grab Giant Orbs to squash mice, phase through danger in Ghost Mode, and dodge Sticky Paws traps.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-[#2B3554] bg-[#090B14] p-4 sm:min-w-[330px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                  Players
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                  {([1, 2] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuClick();
                        setSettings((s) => ({ ...s, playerCount: count }));
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        settings.playerCount === count
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {count === 1 ? '1 Player' : '2 Players'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                  Match Format
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                  {([1, 3] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuClick();
                        setSettings((s) => ({ ...s, totalRounds: r }));
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        settings.totalRounds === r
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {r === 1 ? '1 Round' : 'Best of 3'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                  Mice Speed
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                  {(['chill', 'classic', 'turbo'] as DifficultyLevel[]).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          soundEngine.playMenuClick();
                          setSettings((s) => ({ ...s, difficulty: lvl }));
                        }}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          settings.difficulty === lvl
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Phone View / Touch Controls Selector */}
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                  Phone Controls
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                  {(
                    [
                      { id: 'auto', label: 'Auto' },
                      { id: 'on', label: 'On' },
                      { id: 'off', label: 'Off' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuClick();
                        setTouchPreference(opt.id);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        touchPreference === opt.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1-Player Camera View Selector (Top-Down / 1st-Person / VR Stereo) */}
              {settings.playerCount === 1 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Glasses className="h-3.5 w-3.5 text-violet-400" />
                      1P Camera
                    </span>
                    <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                      {(
                        [
                          { id: 'top_down', label: '2D Top' },
                          { id: 'first_person', label: '1st Person' },
                          { id: 'vr_stereo', label: 'VR Stereo' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playMenuClick();
                            setSettings((s) => ({ ...s, soloViewMode: opt.id }));
                          }}
                          className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                            settings.soloViewMode === opt.id
                              ? 'bg-violet-400 text-slate-950'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400">
                      {settings.soloViewMode === 'vr_stereo'
                        ? 'Full-screen VR · controls hidden · overlay HUD'
                        : 'Meta Quest WebXR & Touch Controllers ready'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playMenuClick();
                        setShowQuestGuide(true);
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-violet-300 transition-colors hover:text-violet-200 whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="h-3 w-3" />
                      Quest / Sideload
                    </button>
                  </div>
                </div>
              )}

              {/* 2-Player Touch / iPad End Layout Selector */}
              {settings.playerCount === 2 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-400">
                    2P Pad Layout
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                    {(
                      [
                        { id: 'dual', label: 'Dual' },
                        { id: 'single_p1', label: 'P1 Only' },
                        { id: 'opposite_ends', label: 'Opposite Ends' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playMenuClick();
                          setMobilePadLayout(opt.id);
                          if (opt.id === 'opposite_ends' && touchPreference === 'off') {
                            setTouchPreference('on');
                          }
                        }}
                        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                          mobilePadLayout === opt.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motion Tilt Controls Selector */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Compass className="h-3.5 w-3.5 text-sky-400" />
                    Motion Tilt (P1)
                  </span>
                  <div className="flex items-center gap-1 rounded-lg bg-[#12172A] p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (motionEnabled) void handleToggleMotion();
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        !motionEnabled
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Off
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!motionEnabled) void handleToggleMotion();
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                        motionEnabled
                          ? 'bg-sky-400 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      On
                    </button>
                  </div>
                </div>
                {motionStatus && (
                  <p className="text-right text-[11px] leading-snug text-sky-300">
                    {motionStatus}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={startNewMatch}
                className="font-arcade mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
              >
                <Gamepad2 className="h-4 w-4" />
                Launch {selectedMaze.name}
              </button>
            </div>
          </section>

          {/* Competitive Maze Selector (5 Templates + Procedural Generator) */}
          <section id="arenas" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-arcade text-lg sm:text-xl text-white">
                  Competitive Maze Arenas (5 Templates + Randomizer)
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Symmetrical spawns · Destructible walls · Strategic speed
                  boosts · Random Ghost &amp; Sticky Paws drops
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playMenuClick();
                    setSettings((s) => ({
                      ...s,
                      randomizeEachRound: !s.randomizeEachRound,
                    }));
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    settings.randomizeEachRound
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : 'border-[#2B3554] bg-[#12172A] text-slate-300 hover:text-white'
                  }`}
                >
                  New Maze Each Round:{' '}
                  {settings.randomizeEachRound ? 'On' : 'Off'}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandomMaze}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-[#161E36] px-3.5 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500 hover:text-slate-950 whitespace-nowrap"
                >
                  <Dices className="h-4 w-4" />
                  Generate Random Maze
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allMazes.map((maze) => {
                const selected = maze.id === settings.mazeId;
                return (
                  <button
                    key={maze.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playMenuClick();
                      setSettings((s) => ({ ...s, mazeId: maze.id }));
                    }}
                    className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-amber-400 bg-[#161E36]'
                        : 'border-[#2B3554] bg-[#12172A] hover:border-slate-500'
                    }`}
                  >
                    <MazeThumbnail maze={maze} />
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-arcade text-sm text-white truncate">
                          {maze.name}
                        </span>
                        {selected && (
                          <span className="text-xs font-semibold text-amber-400 whitespace-nowrap shrink-0">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        {maze.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cat Profile & Skin Customizers */}
          <section id="profiles" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-arcade text-lg sm:text-xl text-white">
                {settings.playerCount === 1
                  ? 'Player 1 Profile & Cat Skin'
                  : 'Player Profiles & Cat Skins'}
              </h2>
              <span className="text-xs text-slate-400">
                Saved automatically to this browser
              </span>
            </div>

            <div
              className={`grid gap-5 ${
                settings.playerCount === 2 ? 'lg:grid-cols-2' : 'max-w-2xl'
              }`}
            >
              <ProfileEditor
                profile={profiles[0]}
                controlsHint={
                  motionEnabled
                    ? 'Motion Tilt / Joystick / Keys'
                    : mobileControlsEnabled
                    ? 'Digital Joystick / WASD / Arrows'
                    : settings.playerCount === 1
                    ? 'WASD or Arrows'
                    : 'W A S D'
                }
                onChange={(updated) => handleProfileChange(0, updated)}
              />
              {settings.playerCount === 2 && (
                <ProfileEditor
                  profile={profiles[1]}
                  controlsHint={
                    mobileControlsEnabled
                      ? 'Right Joystick / Arrows'
                      : 'Arrow Keys'
                  }
                  onChange={(updated) => handleProfileChange(1, updated)}
                />
              )}
            </div>
          </section>

          {/* Power-Ups & Mechanics Guide */}
          <section id="mechanics" className="space-y-4 pb-6">
            <h2 className="font-arcade text-lg sm:text-xl text-white">
              Arcade Power-Ups &amp; Rules
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[#2B3554] bg-[#12172A] p-4">
                <div className="flex items-center gap-2 font-arcade text-xs text-amber-400">
                  <Crown className="h-4 w-4" />
                  Giant Cat (10s)
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Grab golden orbs to grow massive for 10 seconds. Squash
                  panicked mice for combo points, plow through bricks, and boop
                  your rival.
                </p>
              </div>

              <div className="rounded-xl border border-[#2B3554] bg-[#12172A] p-4">
                <div className="flex items-center gap-2 font-arcade text-xs text-sky-400">
                  <Ghost className="h-4 w-4" />
                  Ghost Mode (7s)
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Spawns randomly across the maze. Grants temporary
                  invincibility, Sticky Paws immunity, and lets cats phase
                  harmlessly through mice.
                </p>
              </div>

              <div className="rounded-xl border border-[#2B3554] bg-[#12172A] p-4">
                <div className="flex items-center gap-2 font-arcade text-xs text-fuchsia-400">
                  <Droplets className="h-4 w-4" />
                  Sticky Paws (Mice Trap)
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Random paw tokens empower mice for 10s, leaving gooey puddles.
                  Cats who touch Sticky-Pawed mice or puddles slow down by 45%!
                </p>
              </div>

              <div className="rounded-xl border border-[#2B3554] bg-[#12172A] p-4">
                <div className="flex items-center gap-2 font-arcade text-xs text-emerald-400">
                  <Zap className="h-4 w-4" />
                  Zoomies Boost (6s)
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Collect mint lightning bolts for a +55% speed burst and
                  instant 1-hit crate smashing. Pads respawn every 14 seconds.
                </p>
              </div>

              <div className="rounded-xl border border-[#2B3554] bg-[#12172A] p-4">
                <div className="flex items-center gap-2 font-arcade text-xs text-orange-400">
                  <BrickWall className="h-4 w-4" />
                  Destructible Walls
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Ram amber brick barriers twice (or once when Giant or
                  Speed-Boosted) to blast open flanking shortcuts and escape
                  routes.
                </p>
              </div>

              <div className="rounded-xl border border-[#2B3554] bg-[#12172A] p-4">
                <div className="flex items-center gap-2 font-arcade text-xs text-yellow-300">
                  <Flame className="h-4 w-4" />
                  Chase Multiplier
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Skirt close to patrolling mice or phase through them to build
                  Chase Heat from 1x up to 5x for huge scoring bursts.
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Meta Quest VR Controls & Sideload Guide Modal (Lobby) */}
        {showQuestGuide && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border-2 border-violet-400/70 bg-[#12172A] p-5 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Glasses className="h-5 w-5 text-violet-400" />
                  <h2 className="font-arcade text-base sm:text-lg text-white">
                    Meta Quest VR &amp; Sideload Guide
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuestGuide(false)}
                  aria-label="Close Quest Guide"
                  className="rounded-lg border border-[#2B3554] bg-[#090B14] p-1.5 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
                <div className="rounded-xl border border-[#2B3554] bg-[#090B14] p-3.5">
                  <h3 className="font-arcade text-[11px] text-violet-300">
                    Quest Touch Controller Bindings
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <span>
                      <strong className="text-white">Stick Up / Trigger:</strong> Hold to Move
                    </span>
                    <span>
                      <strong className="text-white">Stick L / R:</strong> Turn 90°
                    </span>
                    <span>
                      <strong className="text-white">Grip Squeeze:</strong> 180° U-Turn
                    </span>
                    <span>
                      <strong className="text-white">Stick Click:</strong> Recenter View
                    </span>
                    <span>
                      <strong className="text-white">A / X Button:</strong> Pause Match
                    </span>
                    <span>
                      <strong className="text-white">B / Y Button:</strong> Exit WebXR
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Controller haptics rumble when smashing walls, squashing mice, or getting caught.
                  </p>
                </div>

                <div className="rounded-xl border border-[#2B3554] bg-[#090B14] p-3.5">
                  <h3 className="font-arcade text-[11px] text-amber-300">
                    Sideload as Custom Quest Software (APK / PWA)
                  </h3>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                    <li>
                      Host the built app (<code className="text-amber-200">npm run build</code>) over HTTPS (e.g., Cloudflare Pages, Vercel, or local HTTPS tunnel).
                    </li>
                    <li>
                      <strong className="text-white">Instant Quest Play:</strong> Open the URL in Meta Quest Browser and tap <strong className="text-violet-300">Quest VR</strong> inside VR Stereo mode for full immersive WebXR.
                    </li>
                    <li>
                      <strong className="text-white">Custom APK Sideload:</strong> Generate an Android/Quest WebAPK using <strong className="text-white">PWABuilder</strong> or <strong className="text-white">Bubblewrap</strong> (the <code className="text-amber-200">manifest.webmanifest</code> &amp; icons are already included), then install via <strong className="text-white">SideQuest</strong> or <code className="text-amber-200">adb install whiskermaze.apk</code>.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowQuestGuide(false)}
                  className="font-arcade rounded-lg bg-violet-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-violet-300"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // ACTIVE ARCADE CABINET SCREEN (PLAYING / PAUSED / ROUND_SUMMARY / GAME_OVER)
  // ============================================================================
  const finalWinner: 1 | 2 | 'DRAW' =
    p1RoundWins > p2RoundWins
      ? 1
      : p2RoundWins > p1RoundWins
      ? 2
      : (roundSummary?.p1Score ?? 0) > (roundSummary?.p2Score ?? 0)
      ? 1
      : (roundSummary?.p2Score ?? 0) > (roundSummary?.p1Score ?? 0)
      ? 2
      : 'DRAW';

  const isVrFullscreen =
    settings.playerCount === 1 && settings.soloViewMode === 'vr_stereo';

  const isOppositeEnds =
    settings.playerCount === 2 &&
    showBottomMobileDeck &&
    mobilePadLayout === 'opposite_ends';

  const activePowerTimers = [
    hud.p1.giantTimer > 0
      ? { label: `GIANT ${hud.p1.giantTimer.toFixed(0)}s`, color: 'bg-amber-500/25 text-amber-300 border-amber-400/50' }
      : null,
    hud.p1.ghostTimer > 0
      ? { label: `GHOST ${hud.p1.ghostTimer.toFixed(0)}s`, color: 'bg-sky-500/25 text-sky-300 border-sky-400/50' }
      : null,
    hud.p1.speedTimer > 0
      ? { label: `BOOST ${hud.p1.speedTimer.toFixed(0)}s`, color: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50' }
      : null,
    hud.p1.stickyTimer > 0
      ? { label: `STICKY ${hud.p1.stickyTimer.toFixed(0)}s`, color: 'bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-400/50' }
      : null,
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div
      className={
        isVrFullscreen
          ? 'relative h-[100dvh] w-screen overflow-hidden bg-[#05070E]'
          : 'relative flex h-[100dvh] w-screen flex-col items-center justify-between overflow-hidden bg-[#090B14] px-2.5 sm:px-4 py-2 sm:py-3'
      }
    >
      {isOppositeEnds ? (
        <OppositeEndsArena
          isPortrait={isPortrait}
          roundSessionKey={roundSessionKey}
          gameState={gameState}
          maze={activeRoundMaze}
          difficulty={settings.difficulty}
          roundNumber={roundNumber}
          totalRounds={settings.totalRounds}
          p1RoundWins={p1RoundWins}
          p2RoundWins={p2RoundWins}
          p1CumulativeScore={p1CumulativeScore}
          p2CumulativeScore={p2CumulativeScore}
          hud={hud}
          profiles={profiles}
          isPaused={gameState === 'PAUSED'}
          isMuted={isMuted}
          motionEnabled={motionEnabled}
          onHudUpdate={setHud}
          onRoundEnd={handleRoundEnd}
          onTogglePause={handleTogglePause}
          onToggleMute={toggleMute}
          onToggleMotion={handleToggleMotion}
          onCycleLayout={cycleMobilePadLayout}
          onQuitToMenu={handleQuitToMenu}
        />
      ) : (
        <>
          {/* Top Arcade HUD (hidden in Full-Screen VR mode) */}
          {!isVrFullscreen && (
            <ArcadeHUD
              hud={hud}
              profiles={profiles}
              mazeName={activeRoundMaze.name}
              isPaused={gameState === 'PAUSED'}
              isMuted={isMuted}
              mobileControlsEnabled={showBottomMobileDeck}
              motionEnabled={motionEnabled}
              soloViewMode={settings.soloViewMode}
              onTogglePause={handleTogglePause}
              onToggleMute={toggleMute}
              onToggleMobileControls={toggleMobileControlsInPlay}
              onToggleMotion={handleToggleMotion}
              onCycleSoloViewMode={cycleSoloViewMode}
              onQuitToMenu={handleQuitToMenu}
            />
          )}

          {/* Central Maze Canvas (preserved across 2D / 1st-Person / Full-Screen VR transitions) */}
          <div
            className={
              isVrFullscreen
                ? 'absolute inset-0 h-full w-full'
                : 'flex w-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden py-1 sm:py-2'
            }
          >
            <GameCanvas
              roundSessionKey={roundSessionKey}
              playerCount={settings.playerCount}
              gameState={gameState}
              maze={activeRoundMaze}
              difficulty={settings.difficulty}
              roundNumber={roundNumber}
              totalRounds={settings.totalRounds}
              p1RoundWins={p1RoundWins}
              p2RoundWins={p2RoundWins}
              p1CumulativeScore={p1CumulativeScore}
              p2CumulativeScore={p2CumulativeScore}
              profiles={profiles}
              mobileControlsEnabled={
                isVrFullscreen ? false : showBottomMobileDeck
              }
              viewMode={settings.soloViewMode}
              fullBleedVR={isVrFullscreen}
              onHudUpdate={setHud}
              onRoundEnd={handleRoundEnd}
              onTogglePause={handleTogglePause}
              onQuestVRStatus={setQuestVRStatus}
              onQuestVRActiveChange={setQuestVRActive}
              onRegisterQuestVR={handleRegisterQuestVR}
            />
          </div>

          {/* Translucent Floating VR Overlay HUD when in VR Stereo Full-Screen */}
          {isVrFullscreen && (
            <>
              <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-2.5 sm:p-4">
                {/* Top-Left Player & Score Glass Overlay */}
                <div className="pointer-events-auto flex flex-wrap items-center gap-2.5 rounded-xl border border-[#2B3554]/80 bg-[#090B14]/60 px-3 py-2 backdrop-blur-md shadow-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-white/40"
                      style={{ backgroundColor: profiles[0].skin.primaryColor }}
                    />
                    <span className="font-arcade text-xs text-white">
                      {profiles[0].name}
                    </span>
                  </div>

                  <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                    {hud.p1.score.toLocaleString()}
                  </span>

                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`Lives: ${hud.p1.lives}`}
                  >
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Heart
                        key={idx}
                        className={`h-3.5 w-3.5 ${
                          idx < hud.p1.lives
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>

                  {hud.p1.multiplier > 1 && (
                    <span className="rounded-md bg-amber-500/25 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300 tabular-nums">
                      {hud.p1.multiplier}x
                    </span>
                  )}

                  <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                    {hud.pelletsRemaining} left
                  </span>

                  {activePowerTimers.map((t) => (
                    <span
                      key={t.label}
                      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${t.color}`}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>

                {/* Top-Right Translucent VR & Match Actions */}
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-[#2B3554]/80 bg-[#090B14]/60 p-1.5 backdrop-blur-md shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      requestBrowserFullscreen();
                      void enterQuestVRFn?.();
                    }}
                    disabled={!enterQuestVRFn}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      questVRActive
                        ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                        : 'bg-violet-400 text-slate-950 hover:bg-violet-300'
                    } disabled:opacity-50`}
                  >
                    <Glasses className="h-3.5 w-3.5" />
                    {questVRActive ? 'Quest VR On' : 'Enter Quest VR'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isFullscreen
                        ? exitBrowserFullscreen()
                        : requestBrowserFullscreen()
                    }
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    aria-label={
                      isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'
                    }
                    className="rounded-lg border border-[#2B3554]/80 bg-[#12172A]/75 p-1.5 text-slate-200 transition-colors hover:border-amber-400/60"
                  >
                    {isFullscreen ? (
                      <Shrink className="h-3.5 w-3.5" />
                    ) : (
                      <Expand className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playMenuClick();
                      setShowQuestGuide(true);
                    }}
                    title="Quest Controls & Sideload Guide"
                    aria-label="Quest Controls & Sideload Guide"
                    className="rounded-lg border border-[#2B3554]/80 bg-[#12172A]/75 p-1.5 text-violet-300 transition-colors hover:border-violet-400/60"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePause}
                    title={gameState === 'PAUSED' ? 'Resume' : 'Pause'}
                    aria-label={gameState === 'PAUSED' ? 'Resume' : 'Pause'}
                    className="rounded-lg border border-[#2B3554]/80 bg-[#12172A]/75 p-1.5 text-slate-200 transition-colors hover:border-amber-400/60"
                  >
                    {gameState === 'PAUSED' ? (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Pause className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className="rounded-lg border border-[#2B3554]/80 bg-[#12172A]/75 p-1.5 text-slate-200 transition-colors hover:border-amber-400/60"
                  >
                    {isMuted ? (
                      <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExitVRMode}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/35 whitespace-nowrap"
                  >
                    <X className="h-3.5 w-3.5" />
                    Exit VR
                  </button>
                </div>
              </div>

              {questVRStatus && (
                <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-sky-400/50 bg-[#090B14]/75 px-3 py-1.5 text-xs font-medium text-sky-200 backdrop-blur-md">
                  {questVRStatus}
                </div>
              )}
            </>
          )}

          {/* Bottom Controls: Digital Joystick / Motion Tilt OR Desktop Legend (hidden in Full-Screen VR mode) */}
          {!isVrFullscreen &&
            (showBottomMobileDeck ? (
              <MobileControls
                playerCount={settings.playerCount}
                profiles={profiles}
                layout={mobilePadLayout}
                motionEnabled={motionEnabled}
                motionStatus={motionStatus}
                onToggleLayout={cycleMobilePadLayout}
                onToggleMotion={handleToggleMotion}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
                {settings.playerCount === 1 ? (
                  <span>
                    <strong className="text-slate-200">
                      P1 {profiles[0].name}:
                    </strong>{' '}
                    {settings.soloViewMode === 'top_down'
                      ? 'WASD or Arrow Keys'
                      : 'Hold W/Up: Move Forward · A/D or Left/Right: Turn · S/Down: U-Turn'}
                  </span>
                ) : (
                  <>
                    <span>
                      <strong className="text-slate-200">
                        P1 {profiles[0].name}:
                      </strong>{' '}
                      W A S D
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      <strong className="text-slate-200">
                        P2 {profiles[1].name}:
                      </strong>{' '}
                      Arrow Keys
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-amber-300">Gold:</strong> 10s Giant
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-sky-300">Ghost:</strong> 7s Phase
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-fuchsia-300">Paws:</strong> Sticky Slow
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-emerald-300">Bolt:</strong> Speed
                </span>
                <span aria-hidden="true">·</span>
                <span>Space / P: Pause · M: Mute</span>
              </div>
            ))}
        </>
      )}

      {/* PAUSED MODAL */}
      {gameState === 'PAUSED' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#2B3554] bg-[#12172A] p-6 text-center shadow-2xl">
            <h2 className="font-arcade text-2xl text-amber-400">Game Paused</h2>
            <p className="mt-2 text-sm text-slate-300">
              {activeRoundMaze.name} · Round {roundNumber} of{' '}
              {settings.totalRounds}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleTogglePause}
                className="font-arcade rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
              >
                Resume Match
              </button>
              <button
                type="button"
                onClick={toggleMobileControlsInPlay}
                className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-400/60"
              >
                Phone Touch Controls: {mobileControlsEnabled ? 'On' : 'Off'}
              </button>
              {settings.playerCount === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!mobileControlsEnabled) setTouchPreference('on');
                    cycleMobilePadLayout();
                  }}
                  className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-400/60"
                >
                  2P Joystick Layout:{' '}
                  {mobilePadLayout === 'dual'
                    ? 'Dual Joysticks'
                    : mobilePadLayout === 'single_p1'
                    ? 'Large P1 Stick'
                    : 'Opposite Ends (iPad)'}
                </button>
              )}
              {settings.playerCount === 1 && (
                <>
                  <button
                    type="button"
                    onClick={cycleSoloViewMode}
                    className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-violet-400/60"
                  >
                    Camera View:{' '}
                    {settings.soloViewMode === 'top_down'
                      ? '2D Top-Down'
                      : settings.soloViewMode === 'first_person'
                      ? 'First-Person 3D'
                      : 'VR Stereo Headset'}
                  </button>
                  {enterQuestVRFn && (
                    <button
                      type="button"
                      onClick={() => {
                        requestBrowserFullscreen();
                        void enterQuestVRFn();
                      }}
                      className="rounded-lg border border-violet-400/60 bg-violet-500/20 px-5 py-2.5 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/35"
                    >
                      {questVRActive ? 'Exit Meta Quest WebXR' : 'Enter Meta Quest WebXR'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowQuestGuide(true)}
                    className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-violet-300 transition-colors hover:border-violet-400/60"
                  >
                    Quest Controls &amp; Sideload Guide
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleToggleMotion}
                className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-400/60"
              >
                Motion Tilt Controls (P1): {motionEnabled ? 'On' : 'Off'}
              </button>
              <button
                type="button"
                onClick={startNewMatch}
                className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500"
              >
                Restart Match
              </button>
              <button
                type="button"
                onClick={handleQuitToMenu}
                className="rounded-lg border border-[#2B3554] bg-[#090B14] px-5 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:text-rose-300"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROUND SUMMARY MODAL */}
      {gameState === 'ROUND_SUMMARY' && roundSummary && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-amber-400/60 bg-[#12172A] p-5 sm:p-6 shadow-2xl">
            <div className="text-center">
              <p className="font-arcade text-xs text-amber-400">
                Round {roundNumber} Complete
              </p>
              <h2 className="font-arcade mt-1 text-xl sm:text-2xl text-white">
                {roundSummary.winner === 1 || roundSummary.winner === 2
                  ? `${profiles[roundSummary.winner - 1].name} ${
                      settings.playerCount === 1
                        ? 'Cleared the Round!'
                        : 'Wins the Round!'
                    }`
                  : roundSummary.winner === 'SOLO_LOSS'
                  ? `${profiles[0].name} Was Caught!`
                  : 'Round Draw!'}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {roundSummary.reason}
              </p>
            </div>

            <div
              className={`mt-5 grid gap-3 ${
                settings.playerCount === 2 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {(settings.playerCount === 2 ? [0, 1] : [0]).map((idx) => {
                const p = profiles[idx];
                const rScore =
                  idx === 0
                    ? roundSummary.p1RoundScore
                    : roundSummary.p2RoundScore;
                const squashed =
                  idx === 0
                    ? roundSummary.p1MiceSquashed
                    : roundSummary.p2MiceSquashed;
                const walls =
                  idx === 0
                    ? roundSummary.p1WallsBroken
                    : roundSummary.p2WallsBroken;
                const wins = idx === 0 ? p1RoundWins : p2RoundWins;
                return (
                  <div
                    key={p.playerNumber}
                    className="rounded-xl border border-[#2B3554] bg-[#090B14] p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <CatPreview
                        skin={p.skin}
                        playerNumber={p.playerNumber}
                        size={40}
                      />
                      <div className="min-w-0">
                        <div
                          className="font-arcade text-xs truncate"
                          style={{ color: p.skin.primaryColor }}
                        >
                          P{p.playerNumber} {p.name}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {wins} Round {wins === 1 ? 'Win' : 'Wins'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-300 tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Round Score</span>
                        <span className="font-mono font-bold text-white">
                          {rScore.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mice Squashed</span>
                        <span className="font-mono">{squashed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Walls Broken</span>
                        <span className="font-mono">{walls}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleQuitToMenu}
                className="rounded-lg border border-[#2B3554] bg-[#090B14] px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
              >
                Exit to Menu
              </button>
              <button
                type="button"
                onClick={handleNextRound}
                className="font-arcade inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                Start Round {roundNumber + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / CHAMPIONSHIP MODAL */}
      {gameState === 'GAME_OVER' && roundSummary && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-amber-400 bg-[#12172A] p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <Trophy className="h-10 w-10 text-amber-400" />
              <p className="font-arcade mt-2 text-xs text-amber-400">
                {settings.playerCount === 1
                  ? roundSummary.winner === 'SOLO_LOSS'
                    ? 'Game Over'
                    : 'Maze Cleared!'
                  : 'Match Complete'}{' '}
                · {activeRoundMaze.name}
              </p>
              <h2 className="font-arcade mt-1 text-xl sm:text-2xl text-white">
                {settings.playerCount === 1
                  ? roundSummary.winner === 'SOLO_LOSS'
                    ? `${profiles[0].name} Was Caught!`
                    : `${profiles[0].name} Cleared the Run!`
                  : finalWinner === 'DRAW'
                  ? 'Tie Match!'
                  : `${profiles[finalWinner - 1].name} Takes the Crown!`}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {roundSummary.reason}
              </p>
            </div>

            <div
              className={`mt-5 grid gap-3 ${
                settings.playerCount === 2 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {(settings.playerCount === 2 ? [0, 1] : [0]).map((idx) => {
                const p = profiles[idx];
                const totalScore =
                  idx === 0 ? roundSummary.p1Score : roundSummary.p2Score;
                const wins = idx === 0 ? p1RoundWins : p2RoundWins;
                const isChamp =
                  settings.playerCount === 1
                    ? roundSummary.winner !== 'SOLO_LOSS'
                    : finalWinner === p.playerNumber;
                return (
                  <div
                    key={p.playerNumber}
                    className={`rounded-xl border p-3.5 sm:p-4 ${
                      isChamp
                        ? 'border-amber-400 bg-[#19223E]'
                        : 'border-[#2B3554] bg-[#090B14]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <CatPreview
                        skin={p.skin}
                        playerNumber={p.playerNumber}
                        size={46}
                        giantPreview={isChamp}
                      />
                      <div className="min-w-0">
                        <div
                          className="font-arcade text-xs truncate"
                          style={{ color: p.skin.primaryColor }}
                        >
                          P{p.playerNumber} {p.name}
                        </div>
                        <div className="mt-0.5 font-mono text-base sm:text-lg font-bold text-white tabular-nums">
                          {totalScore.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">
                          {wins} / {settings.totalRounds} Rounds Cleared
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleQuitToMenu}
                className="rounded-lg border border-[#2B3554] bg-[#090B14] px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white whitespace-nowrap"
              >
                Customize Cats
              </button>
              <button
                type="button"
                onClick={startNewMatch}
                className="font-arcade inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Quest VR Controls & Sideload Guide Modal (In-Game / Paused) */}
      {showQuestGuide && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border-2 border-violet-400/70 bg-[#12172A] p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Glasses className="h-5 w-5 text-violet-400" />
                <h2 className="font-arcade text-base sm:text-lg text-white">
                  Meta Quest VR &amp; Sideload Guide
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQuestGuide(false)}
                aria-label="Close Quest Guide"
                className="rounded-lg border border-[#2B3554] bg-[#090B14] p-1.5 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="rounded-xl border border-[#2B3554] bg-[#090B14] p-3.5">
                <h3 className="font-arcade text-[11px] text-violet-300">
                  Quest Touch Controller Bindings
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <span>
                    <strong className="text-white">Stick Up / Trigger:</strong> Hold to Move
                  </span>
                  <span>
                    <strong className="text-white">Stick L / R:</strong> Turn 90°
                  </span>
                  <span>
                    <strong className="text-white">Grip Squeeze:</strong> 180° U-Turn
                  </span>
                  <span>
                    <strong className="text-white">Stick Click:</strong> Recenter View
                  </span>
                  <span>
                    <strong className="text-white">A / X Button:</strong> Pause Match
                  </span>
                  <span>
                    <strong className="text-white">B / Y Button:</strong> Exit WebXR
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  On phones/tablets in VR full-screen, press &amp; hold the screen to move forward and swipe Left/Right/Down to turn.
                </p>
              </div>

              <div className="rounded-xl border border-[#2B3554] bg-[#090B14] p-3.5">
                <h3 className="font-arcade text-[11px] text-amber-300">
                  Sideload as Custom Quest Software (APK / PWA)
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                  <li>
                    Host the built app (<code className="text-amber-200">npm run build</code>) over HTTPS.
                  </li>
                  <li>
                    <strong className="text-white">Quest Browser WebXR:</strong> Open over HTTPS and tap <strong className="text-violet-300">Enter Quest VR</strong> for stereoscopic immersive play.
                  </li>
                  <li>
                    <strong className="text-white">Custom APK Sideload:</strong> Package with <strong className="text-white">PWABuilder</strong> or <strong className="text-white">Bubblewrap</strong> (<code className="text-amber-200">manifest.webmanifest</code> &amp; icons are ready) and sideload via <strong className="text-white">SideQuest</strong> or <code className="text-amber-200">adb install</code>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowQuestGuide(false)}
                className="font-arcade rounded-lg bg-violet-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-violet-300"
              >
                Back to Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
