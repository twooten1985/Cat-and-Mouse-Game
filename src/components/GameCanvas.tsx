import React, { useEffect, useRef } from 'react';
import {
  DifficultyLevel,
  Direction,
  GameState,
  HUDState,
  MazeDefinition,
  PlayerProfile,
  SoloViewMode,
  TileType,
} from '../types/game';
import { drawCatSprite, drawMouseSprite } from '../utils/canvasSprites';
import {
  launchQuestImmersiveVR,
  pulseStandardGamepads,
  QuestXRController,
  StandardGamepadPoller,
} from '../utils/questWebXR';
import {
  renderFirstPersonMazeView,
  renderSingleVREyeCanvas,
} from '../utils/raycastRenderer';
import { soundEngine } from '../utils/sound';

const COLS = 23;
const ROWS = 17;
const TILE = 38;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;

const GIANT_DURATION = 10.0;
const SPEED_DURATION = 6.0;
const GHOST_DURATION = 7.0;
const STICKY_MOUSE_DURATION = 10.0;
const STICKY_CAT_SLOW_DURATION = 4.0;
const SPEED_RESPAWN_TIME = 14.0;
const RANDOM_POWERUP_RESPAWN_TIME = 15.0;

interface CatEntity {
  playerNumber: 1 | 2;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  dir: Direction;
  facingDir: Direction;
  camAngle: number;
  headBobPhase: number;
  nextDir: Direction;
  nextDirTimer: number;
  score: number;
  roundScore: number;
  lives: number;
  chaseHeat: number;
  chaseGrace: number;
  multiplier: number;
  giantTimer: number;
  speedTimer: number;
  ghostTimer: number;
  stickyTimer: number;
  stickyImmunityTimer: number;
  invulnerableTimer: number;
  stunTimer: number;
  wallHitCooldown: number;
  squashStreak: number;
  miceSquashedThisRound: number;
  wallsBrokenThisRound: number;
  phaseCooldowns: Record<number, number>;
  trail: { x: number; y: number; color: string }[];
  alive: boolean;
}

interface MouseEntity {
  id: number;
  name: string;
  furColor: string;
  earInnerColor: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  dir: Direction;
  squashedTimer: number;
  stickyPawsTimer: number;
  puddleDropTimer: number;
  exitDelay: number;
  lastTurnRow: number;
  lastTurnCol: number;
  behavior: 'chaser' | 'ambusher' | 'flanker' | 'opportunist';
}

interface StickyPuddle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

interface SpeedPad {
  row: number;
  col: number;
  respawnTimer: number;
}

interface GameCanvasProps {
  roundSessionKey: number;
  playerCount: 1 | 2;
  gameState: GameState;
  maze: MazeDefinition;
  difficulty: DifficultyLevel;
  roundNumber: number;
  totalRounds: number;
  p1RoundWins: number;
  p2RoundWins: number;
  p1CumulativeScore: number;
  p2CumulativeScore: number;
  profiles: [PlayerProfile, PlayerProfile];
  mobileControlsEnabled: boolean;
  viewMode?: SoloViewMode;
  fullBleedVR?: boolean;
  canvasMaxHeight?: string;
  canvasMaxWidth?: string;
  onHudUpdate: (hud: HUDState) => void;
  onRoundEnd: (result: {
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
  }) => void;
  onTogglePause: () => void;
  onQuestVRStatus?: (msg: string) => void;
  onQuestVRActiveChange?: (active: boolean) => void;
  onRegisterQuestVR?: (enterFn: (() => Promise<void>) | null) => void;
}

function dirToVec(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case 'UP':
      return { dx: 0, dy: -1 };
    case 'DOWN':
      return { dx: 0, dy: 1 };
    case 'LEFT':
      return { dx: -1, dy: 0 };
    case 'RIGHT':
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

function isOppositeDir(a: Direction, b: Direction): boolean {
  return (
    (a === 'UP' && b === 'DOWN') ||
    (a === 'DOWN' && b === 'UP') ||
    (a === 'LEFT' && b === 'RIGHT') ||
    (a === 'RIGHT' && b === 'LEFT')
  );
}

function dirToAngle(dir: Direction): number {
  switch (dir) {
    case 'RIGHT':
      return 0;
    case 'DOWN':
      return Math.PI / 2;
    case 'LEFT':
      return Math.PI;
    case 'UP':
      return -Math.PI / 2;
    default:
      return 0;
  }
}

function relativeInputToWorldDir(
  facingDir: Direction,
  inputDir: Direction
): Direction {
  const base = facingDir === 'NONE' ? 'RIGHT' : facingDir;
  if (inputDir === 'UP') return base;
  if (inputDir === 'DOWN') {
    if (base === 'UP') return 'DOWN';
    if (base === 'DOWN') return 'UP';
    if (base === 'LEFT') return 'RIGHT';
    return 'LEFT';
  }
  if (inputDir === 'RIGHT') {
    if (base === 'UP') return 'RIGHT';
    if (base === 'RIGHT') return 'DOWN';
    if (base === 'DOWN') return 'LEFT';
    return 'UP';
  }
  if (inputDir === 'LEFT') {
    if (base === 'UP') return 'LEFT';
    if (base === 'LEFT') return 'DOWN';
    if (base === 'DOWN') return 'RIGHT';
    return 'UP';
  }
  return base;
}

function getMultiplierFromHeat(heat: number): number {
  if (heat >= 85) return 5;
  if (heat >= 65) return 4;
  if (heat >= 40) return 3;
  if (heat >= 20) return 2;
  return 1;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  roundSessionKey,
  playerCount,
  gameState,
  maze,
  difficulty,
  roundNumber,
  totalRounds,
  p1RoundWins,
  p2RoundWins,
  p1CumulativeScore,
  p2CumulativeScore,
  profiles,
  mobileControlsEnabled,
  viewMode = 'top_down',
  fullBleedVR = false,
  canvasMaxHeight,
  canvasMaxWidth,
  onHudUpdate,
  onRoundEnd,
  onTogglePause,
  onQuestVRStatus,
  onQuestVRActiveChange,
  onRegisterQuestVR,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vrCanvasAspectRef = useRef<number>(1.77);
  const swipeOriginRef = useRef<{ x: number; y: number; steered: boolean } | null>(
    null
  );
  const fpTouchForwardRef = useRef(false);
  const fpTouchTimerRef = useRef<number | null>(null);
  const [fittedSize, setFittedSize] = React.useState<{
    w: number;
    h: number;
  } | null>(null);
  const gameStateRef = useRef(gameState);
  const viewModeRef = useRef<SoloViewMode>(viewMode);
  const profilesRef = useRef(profiles);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onRoundEndRef = useRef(onRoundEnd);
  const onTogglePauseRef = useRef(onTogglePause);
  const onQuestVRStatusRef = useRef(onQuestVRStatus);
  const onQuestVRActiveChangeRef = useRef(onQuestVRActiveChange);
  const onRegisterQuestVRRef = useRef(onRegisterQuestVR);
  const roundWinsRef = useRef({ p1: p1RoundWins, p2: p2RoundWins });
  const initialScoresRef = useRef({ p1: p1CumulativeScore, p2: p2CumulativeScore });

  gameStateRef.current = gameState;
  viewModeRef.current = playerCount === 1 ? viewMode : 'top_down';
  profilesRef.current = profiles;
  onHudUpdateRef.current = onHudUpdate;
  onRoundEndRef.current = onRoundEnd;
  onTogglePauseRef.current = onTogglePause;
  onQuestVRStatusRef.current = onQuestVRStatus;
  onQuestVRActiveChangeRef.current = onQuestVRActiveChange;
  onRegisterQuestVRRef.current = onRegisterQuestVR;
  roundWinsRef.current = { p1: p1RoundWins, p2: p2RoundWins };
  initialScoresRef.current = { p1: p1CumulativeScore, p2: p2CumulativeScore };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (fullBleedVR) {
        const w = Math.max(320, Math.floor(rect.width));
        const h = Math.max(240, Math.floor(rect.height));
        vrCanvasAspectRef.current = w / h;
        setFittedSize({ w, h });
        return;
      }
      // Account for 16px border/padding around the canvas frame
      const availW = Math.max(120, rect.width - 18);
      const availH = Math.max(100, rect.height - 18);
      const scale = Math.min(availW / CANVAS_W, availH / CANVAS_H);
      setFittedSize({
        w: Math.max(120, Math.floor(CANVAS_W * scale)),
        h: Math.max(90, Math.floor(CANVAS_H * scale)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [fullBleedVR]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Parse maze grid
    const grid: TileType[][] = [];
    const wallHp: number[][] = [];
    const speedPads: SpeedPad[] = [];
    const nestTiles: { row: number; col: number }[] = [];
    let p1Spawn = { x: TILE * 1.5, y: TILE * 13.5 };
    let p2Spawn = { x: TILE * 21.5, y: TILE * 13.5 };
    let totalPellets = 0;

    for (let r = 0; r < ROWS; r++) {
      const rowStr = maze.rows[r] || '';
      const rowTiles: TileType[] = [];
      const rowHp: number[] = [];
      for (let c = 0; c < COLS; c++) {
        const ch = rowStr[c] || ' ';
        let tile = TileType.EMPTY;
        let hp = 0;
        if (ch === '#') {
          tile = TileType.WALL;
        } else if (ch === 'D') {
          tile = TileType.DESTRUCTIBLE;
          hp = 2;
        } else if (ch === 'M') {
          tile = TileType.MOUSE_NEST;
          nestTiles.push({ row: r, col: c });
        } else if (ch === '-') {
          tile = TileType.NEST_GATE;
        } else if (ch === '.') {
          tile = TileType.PELLET;
          totalPellets++;
        } else if (ch === 'O') {
          tile = TileType.GIANT_ORB;
          totalPellets++;
        } else if (ch === 'S') {
          tile = TileType.SPEED_BOOST;
          speedPads.push({ row: r, col: c, respawnTimer: 0 });
        } else if (ch === '1') {
          tile = TileType.EMPTY;
          p1Spawn = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
        } else if (ch === '2') {
          tile = TileType.EMPTY;
          p2Spawn = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
        }
        rowTiles.push(tile);
        rowHp.push(hp);
      }
      grid.push(rowTiles);
      wallHp.push(rowHp);
    }

    // Helper to randomly place Ghost Mode and Sticky Paws power-ups on open maze tiles
    const spawnRandomPowerUp = (
      powerType: TileType.GHOST_ORB | TileType.STICKY_PAWS,
      allowOverPellet: boolean
    ): boolean => {
      const candidates: { r: number; c: number }[] = [];
      for (let r = 1; r < ROWS - 1; r++) {
        for (let c = 1; c < COLS - 1; c++) {
          const t = grid[r][c];
          const validTile = allowOverPellet
            ? t === TileType.PELLET || t === TileType.EMPTY
            : t === TileType.EMPTY;
          if (!validTile) continue;
          const px = (c + 0.5) * TILE;
          const py = (r + 0.5) * TILE;
          if (
            Math.hypot(px - p1Spawn.x, py - p1Spawn.y) < TILE * 2.8 ||
            Math.hypot(px - p2Spawn.x, py - p2Spawn.y) < TILE * 2.8
          ) {
            continue;
          }
          candidates.push({ r, c });
        }
      }
      if (candidates.length === 0) return false;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (grid[pick.r][pick.c] === TileType.PELLET) {
        totalPellets = Math.max(1, totalPellets - 1);
      }
      grid[pick.r][pick.c] = powerType;
      return true;
    };

    // Distribute 2 random Ghost Mode orbs and 2 random Sticky Paws pickups initially
    spawnRandomPowerUp(TileType.GHOST_ORB, true);
    spawnRandomPowerUp(TileType.GHOST_ORB, true);
    spawnRandomPowerUp(TileType.STICKY_PAWS, true);
    spawnRandomPowerUp(TileType.STICKY_PAWS, true);

    let pelletsRemaining = totalPellets;

    const createCat = (
      playerNumber: 1 | 2,
      spawn: { x: number; y: number },
      initialScore: number
    ): CatEntity => {
      const startDir: Direction = playerNumber === 1 ? 'RIGHT' : 'LEFT';
      return {
        playerNumber,
        x: spawn.x,
        y: spawn.y,
        spawnX: spawn.x,
        spawnY: spawn.y,
        dir: startDir,
        facingDir: startDir,
        camAngle: dirToAngle(startDir),
        headBobPhase: 0,
        nextDir: 'NONE',
      nextDirTimer: 0,
      score: initialScore,
      roundScore: 0,
      lives: 3,
      chaseHeat: 0,
      chaseGrace: 0,
      multiplier: 1,
      giantTimer: 0,
      speedTimer: 0,
      ghostTimer: 0,
      stickyTimer: 0,
      stickyImmunityTimer: 0,
      invulnerableTimer: 1.5,
      stunTimer: 0,
      wallHitCooldown: 0,
      squashStreak: 0,
      miceSquashedThisRound: 0,
      wallsBrokenThisRound: 0,
      phaseCooldowns: {},
      trail: [],
      alive: true,
    };
    };

    const cats: [CatEntity, CatEntity] = [
      createCat(1, p1Spawn, initialScoresRef.current.p1),
      createCat(2, p2Spawn, initialScoresRef.current.p2),
    ];
    if (playerCount === 1) {
      cats[1].alive = false;
    }

    const mouseConfigs: {
      name: string;
      fur: string;
      ear: string;
      behavior: MouseEntity['behavior'];
    }[] = [
      { name: 'Cheddar', fur: '#94A3B8', ear: '#F9A8D4', behavior: 'chaser' },
      { name: 'Pepper', fur: '#64748B', ear: '#FDA4AF', behavior: 'ambusher' },
      { name: 'Bleu', fur: '#7DD3FC', ear: '#FBCFE8', behavior: 'flanker' },
      { name: 'Gouda', fur: '#FBBF24', ear: '#FDA4AF', behavior: 'opportunist' },
    ];

    const fallbackNest = nestTiles[0] || { row: 7, col: 11 };
    const mice: MouseEntity[] = mouseConfigs.map((cfg, idx) => {
      const n = nestTiles[idx % Math.max(1, nestTiles.length)] || fallbackNest;
      const sx = (n.col + 0.5) * TILE;
      const sy = (n.row + 0.5) * TILE;
      return {
        id: idx,
        name: cfg.name,
        furColor: cfg.fur,
        earInnerColor: cfg.ear,
        x: sx,
        y: sy,
        spawnX: sx,
        spawnY: sy,
        dir: 'UP',
        squashedTimer: 0,
        stickyPawsTimer: 0,
        puddleDropTimer: 0,
        exitDelay: idx * 0.9,
        lastTurnRow: -1,
        lastTurnCol: -1,
        behavior: cfg.behavior,
      };
    });

    const stickyPuddles: StickyPuddle[] = [];
    const particles: Particle[] = [];
    const floatingTexts: FloatingText[] = [];
    let shakeTimer = 0;
    let shakeIntensity = 0;
    let roundTimeElapsed = 0;
    let roundEnded = false;
    let hudEmitTimer = 0;
    let randomPowerupTimer = RANDOM_POWERUP_RESPAWN_TIME;

    const baseCatSpeed =
      difficulty === 'chill' ? 148 : difficulty === 'turbo' ? 186 : 165;
    const baseMouseSpeed =
      difficulty === 'chill' ? 116 : difficulty === 'turbo' ? 156 : 134;

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed: number = 140
    ) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const mag = (0.35 + Math.random() * 0.85) * speed;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * mag,
          vy: Math.sin(ang) * mag,
          life: 0.35 + Math.random() * 0.3,
          maxLife: 0.65,
          size: 2.5 + Math.random() * 3.5,
          color,
        });
      }
    };

    const spawnFloatingText = (
      x: number,
      y: number,
      text: string,
      color: string,
      scale: number = 1
    ) => {
      floatingTexts.push({
        x,
        y,
        text,
        color,
        life: 0.95,
        maxLife: 0.95,
        scale,
      });
    };

    const isPassableForCat = (
      col: number,
      row: number,
      canAutoSmash: boolean
    ): boolean => {
      if (row < 0 || row >= ROWS) return false;
      const wrappedCol = ((col % COLS) + COLS) % COLS;
      const t = grid[row][wrappedCol];
      if (
        t === TileType.WALL ||
        t === TileType.MOUSE_NEST ||
        t === TileType.NEST_GATE
      ) {
        return false;
      }
      if (t === TileType.DESTRUCTIBLE) {
        return canAutoSmash;
      }
      return true;
    };

    const isPassableForMouse = (col: number, row: number): boolean => {
      if (row < 0 || row >= ROWS) return false;
      const wrappedCol = ((col % COLS) + COLS) % COLS;
      const t = grid[row][wrappedCol];
      return t !== TileType.WALL && t !== TileType.DESTRUCTIBLE;
    };

    const emitHud = () => {
      onHudUpdateRef.current({
        playerCount,
        p1: {
          playerNumber: 1,
          score: cats[0].score,
          roundScore: cats[0].roundScore,
          lives: cats[0].lives,
          multiplier: cats[0].multiplier,
          chaseHeat: Math.round(cats[0].chaseHeat),
          giantTimer: Math.max(0, cats[0].giantTimer),
          speedTimer: Math.max(0, cats[0].speedTimer),
          ghostTimer: Math.max(0, cats[0].ghostTimer),
          stickyTimer: Math.max(0, cats[0].stickyTimer),
          squashStreak: cats[0].squashStreak,
          miceSquashedThisRound: cats[0].miceSquashedThisRound,
          wallsBrokenThisRound: cats[0].wallsBrokenThisRound,
        },
        p2: {
          playerNumber: 2,
          score: cats[1].score,
          roundScore: cats[1].roundScore,
          lives: cats[1].lives,
          multiplier: cats[1].multiplier,
          chaseHeat: Math.round(cats[1].chaseHeat),
          giantTimer: Math.max(0, cats[1].giantTimer),
          speedTimer: Math.max(0, cats[1].speedTimer),
          ghostTimer: Math.max(0, cats[1].ghostTimer),
          stickyTimer: Math.max(0, cats[1].stickyTimer),
          squashStreak: cats[1].squashStreak,
          miceSquashedThisRound: cats[1].miceSquashedThisRound,
          wallsBrokenThisRound: cats[1].wallsBrokenThisRound,
        },
        pelletsRemaining,
        pelletsTotal: totalPellets,
        roundNumber,
        totalRounds,
        p1RoundWins: roundWinsRef.current.p1,
        p2RoundWins: roundWinsRef.current.p2,
        roundTimeElapsed,
        roundWinner: null,
        roundEndReason: '',
      });
    };

    // Keyboard, Digital Joystick & Quest/Gamepad Controllers
    let lastVirtualDirP1: Direction = 'NONE';
    let questXR: QuestXRController | null = null;
    let headYawOffset = 0;
    const gamepadPoller = new StandardGamepadPoller();
    const heldForwardKeys = new Set<string>();
    let fpVirtualForwardHeld = false;
    let fpGamepadForwardHeld = false;

    const isForwardHeldNow = () =>
      heldForwardKeys.size > 0 ||
      fpVirtualForwardHeld ||
      fpTouchForwardRef.current ||
      fpGamepadForwardHeld;

    const triggerHaptics = (intensity: number, durationMs: number) => {
      questXR?.pulseHaptics(intensity, durationMs);
      pulseStandardGamepads(intensity, durationMs);
    };

    const applyDirectionInput = (
      playerNum: 1 | 2,
      dir: Direction,
      isFirstPersonTurn = false
    ) => {
      if (gameStateRef.current !== 'PLAYING' || dir === 'NONE') return;
      const target = cats[playerNum - 1];

      if (isFirstPersonTurn && playerNum === 1) {
        const worldDir = relativeInputToWorldDir(target.facingDir, dir);

        if (dir === 'UP') {
          target.nextDir = 'NONE';
          return;
        }

        if (dir === 'DOWN') {
          // 180-degree quick U-turn in 1st-person / VR
          target.facingDir = worldDir;
          target.dir = worldDir;
          target.nextDir = 'NONE';
          return;
        }

        // LEFT or RIGHT 90-degree turn
        const curCol = Math.floor(target.x / TILE);
        const curRow = Math.floor(target.y / TILE);
        const centerX = (curCol + 0.5) * TILE;
        const centerY = (curRow + 0.5) * TILE;
        const { dx: ndx, dy: ndy } = dirToVec(worldDir);
        const canAutoSmash = target.giantTimer > 0 || target.speedTimer > 0;
        const sidePassable = isPassableForCat(
          curCol + ndx,
          curRow + ndy,
          canAutoSmash
        );

        if (!isForwardHeldNow()) {
          // Stopped: rotate camera & facing direction immediately
          if (
            sidePassable &&
            Math.abs(target.x - centerX) <= TILE * 0.45 &&
            Math.abs(target.y - centerY) <= TILE * 0.45
          ) {
            target.x = centerX;
            target.y = centerY;
          }
          target.facingDir = worldDir;
          target.dir = worldDir;
          target.nextDir = 'NONE';
          return;
        }

        target.nextDir = worldDir;
        target.nextDirTimer = 0.48;
        return;
      }

      target.nextDir = dir;
      target.nextDirTimer = 0.35;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === ' '
      ) {
        e.preventDefault();
      }

      if (key === 'p' || key === 'P' || key === 'Escape' || key === ' ') {
        if (
          gameStateRef.current === 'PLAYING' ||
          gameStateRef.current === 'PAUSED'
        ) {
          onTogglePauseRef.current();
          return;
        }
      }

      if (gameStateRef.current !== 'PLAYING') return;

      const inFirstPerson =
        playerCount === 1 && viewModeRef.current !== 'top_down';
      const lower = key.toLowerCase();
      if (inFirstPerson && (lower === 'w' || key === 'ArrowUp')) {
        heldForwardKeys.add(lower);
      }
      if (inFirstPerson && e.repeat) return;

      if (key === 'w' || key === 'W')
        applyDirectionInput(1, 'UP', inFirstPerson);
      else if (key === 's' || key === 'S')
        applyDirectionInput(1, 'DOWN', inFirstPerson);
      else if (key === 'a' || key === 'A')
        applyDirectionInput(1, 'LEFT', inFirstPerson);
      else if (key === 'd' || key === 'D')
        applyDirectionInput(1, 'RIGHT', inFirstPerson);

      const arrowTarget: 1 | 2 = playerCount === 1 ? 1 : 2;
      const arrowFp = arrowTarget === 1 && inFirstPerson;
      if (key === 'ArrowUp') applyDirectionInput(arrowTarget, 'UP', arrowFp);
      else if (key === 'ArrowDown')
        applyDirectionInput(arrowTarget, 'DOWN', arrowFp);
      else if (key === 'ArrowLeft')
        applyDirectionInput(arrowTarget, 'LEFT', arrowFp);
      else if (key === 'ArrowRight')
        applyDirectionInput(arrowTarget, 'RIGHT', arrowFp);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const lower = e.key.toLowerCase();
      if (lower === 'w' || e.key === 'ArrowUp') {
        heldForwardKeys.delete(lower);
      }
    };

    const handleWindowBlur = () => {
      heldForwardKeys.clear();
      fpVirtualForwardHeld = false;
      fpGamepadForwardHeld = false;
      fpTouchForwardRef.current = false;
      if (fpTouchTimerRef.current !== null) {
        window.clearTimeout(fpTouchTimerRef.current);
        fpTouchTimerRef.current = null;
      }
    };

    const handleVirtualInput = (e: Event) => {
      const custom = e as CustomEvent<{ player: 1 | 2; dir: Direction }>;
      if (!custom.detail) return;
      const targetPlayer = playerCount === 1 ? 1 : custom.detail.player;
      const dir = custom.detail.dir;

      const inFirstPerson =
        playerCount === 1 && viewModeRef.current !== 'top_down';
      if (inFirstPerson && targetPlayer === 1) {
        if (dir === 'NONE') {
          fpVirtualForwardHeld = false;
          lastVirtualDirP1 = 'NONE';
          return;
        }
        if (dir === 'UP') {
          fpVirtualForwardHeld = true;
          lastVirtualDirP1 = 'UP';
          applyDirectionInput(1, 'UP', true);
          return;
        }
        fpVirtualForwardHeld = false;
        if (dir === lastVirtualDirP1) {
          return;
        }
        lastVirtualDirP1 = dir;
        applyDirectionInput(1, dir, true);
        return;
      }

      applyDirectionInput(targetPlayer, dir, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('whisker-input', handleVirtualInput);
    emitHud();

    const finishRound = (
      winner: 1 | 2 | 'DRAW' | 'SOLO_LOSS',
      reason: string
    ) => {
      if (roundEnded) return;
      roundEnded = true;
      if (winner === 'SOLO_LOSS') {
        soundEngine.playCatHit();
      } else {
        soundEngine.playRoundWin();
      }
      emitHud();
      onRoundEndRef.current({
        winner,
        reason,
        p1Score: cats[0].score,
        p2Score: cats[1].score,
        p1RoundScore: cats[0].roundScore,
        p2RoundScore: cats[1].roundScore,
        p1MiceSquashed: cats[0].miceSquashedThisRound,
        p2MiceSquashed: cats[1].miceSquashedThisRound,
        p1WallsBroken: cats[0].wallsBrokenThisRound,
        p2WallsBroken: cats[1].wallsBrokenThisRound,
      });
    };

    const applyStickySlowToCat = (cat: CatEntity, label: string) => {
      if (cat.ghostTimer > 0 || cat.stickyImmunityTimer > 0) return;
      cat.stickyTimer = STICKY_CAT_SLOW_DURATION;
      cat.stickyImmunityTimer = 1.2;
      soundEngine.playStickyPaws();
      spawnParticles(cat.x, cat.y, '#E879F9', 10, 120);
      spawnFloatingText(cat.x, cat.y - 16, label, '#E879F9', 1.0);
    };

    const damageOrBreakWall = (
      cat: CatEntity,
      row: number,
      col: number,
      instant: boolean
    ) => {
      const wc = ((col % COLS) + COLS) % COLS;
      if (row < 0 || row >= ROWS) return;
      if (grid[row][wc] !== TileType.DESTRUCTIBLE) return;

      if (instant) {
        wallHp[row][wc] = 0;
      } else {
        if (cat.wallHitCooldown > 0) return;
        cat.wallHitCooldown = 0.26;
        wallHp[row][wc] -= 1;
      }

      const wx = (wc + 0.5) * TILE;
      const wy = (row + 0.5) * TILE;

      if (wallHp[row][wc] <= 0) {
        grid[row][wc] = TileType.EMPTY;
        cat.wallsBrokenThisRound++;
        const pts = 25 * cat.multiplier;
        cat.score += pts;
        cat.roundScore += pts;
        cat.chaseHeat = Math.min(100, cat.chaseHeat + 10);
        soundEngine.playWallBreak();
        triggerHaptics(0.65, 90);
        spawnParticles(wx, wy, '#F59E0B', 14, 175);
        spawnParticles(wx, wy, '#94A3B8', 8, 120);
        spawnFloatingText(wx, wy - 10, `SMASH! +${pts}`, '#FBBF24', 0.95);
        shakeTimer = 0.12;
        shakeIntensity = 3.5;
      } else {
        soundEngine.playWallCrack();
        spawnParticles(wx, wy, '#D97706', 6, 95);
      }
    };

    const updateCat = (cat: CatEntity, dt: number) => {
      if (!cat.alive) return;

      if (cat.giantTimer > 0) {
        cat.giantTimer = Math.max(0, cat.giantTimer - dt);
        if (cat.giantTimer === 0) {
          cat.squashStreak = 0;
        }
      }
      if (cat.speedTimer > 0) {
        cat.speedTimer = Math.max(0, cat.speedTimer - dt);
      }
      if (cat.ghostTimer > 0) {
        cat.ghostTimer = Math.max(0, cat.ghostTimer - dt);
      }
      if (cat.stickyTimer > 0) {
        cat.stickyTimer = Math.max(0, cat.stickyTimer - dt);
      }
      if (cat.stickyImmunityTimer > 0) {
        cat.stickyImmunityTimer = Math.max(0, cat.stickyImmunityTimer - dt);
      }
      if (cat.invulnerableTimer > 0) {
        cat.invulnerableTimer = Math.max(0, cat.invulnerableTimer - dt);
      }
      if (cat.wallHitCooldown > 0) {
        cat.wallHitCooldown = Math.max(0, cat.wallHitCooldown - dt);
      }
      for (const mId of Object.keys(cat.phaseCooldowns)) {
        const idNum = Number(mId);
        cat.phaseCooldowns[idNum] -= dt;
        if (cat.phaseCooldowns[idNum] <= 0) delete cat.phaseCooldowns[idNum];
      }

      if (cat.stunTimer > 0) {
        cat.stunTimer = Math.max(0, cat.stunTimer - dt);
        return;
      }

      if (cat.nextDir !== 'NONE') {
        cat.nextDirTimer -= dt;
        if (cat.nextDirTimer <= 0) {
          cat.nextDir = 'NONE';
        }
      }

      const isGiant = cat.giantTimer > 0;
      const isSpeed = cat.speedTimer > 0;
      const isGhost = cat.ghostTimer > 0;
      const isSticky = cat.stickyTimer > 0;
      const canAutoSmash = isGiant || isSpeed;

      const isManualFirstPerson =
        playerCount === 1 &&
        viewModeRef.current !== 'top_down' &&
        cat.playerNumber === 1;
      const forwardActive = !isManualFirstPerson || isForwardHeldNow();

      let speed = isManualFirstPerson ? baseCatSpeed * 0.64 : baseCatSpeed;
      if (isSpeed) speed *= isManualFirstPerson ? 1.35 : 1.55;
      if (isGiant) speed *= isManualFirstPerson ? 1.08 : 1.12;
      if (isGhost) speed *= isManualFirstPerson ? 1.06 : 1.08;
      if (isSticky && !isGhost) speed *= 0.55;

      const curCol = Math.floor(cat.x / TILE);
      const curRow = Math.floor(cat.y / TILE);
      const centerX = (curCol + 0.5) * TILE;
      const centerY = (curRow + 0.5) * TILE;

      // Buffered turning with smooth Pac-Man corner tolerance
      if (forwardActive && cat.nextDir !== 'NONE' && cat.nextDir !== cat.dir) {
        if (isOppositeDir(cat.dir, cat.nextDir)) {
          cat.dir = cat.nextDir;
          cat.nextDir = 'NONE';
        } else {
          const { dx: ndx, dy: ndy } = dirToVec(cat.nextDir);
          const distToCenterX = Math.abs(cat.x - centerX);
          const distToCenterY = Math.abs(cat.y - centerY);
          const turnTol = TILE * 0.38;

          if (
            (ndx !== 0 && distToCenterY <= turnTol) ||
            (ndy !== 0 && distToCenterX <= turnTol)
          ) {
            const targetCol = curCol + ndx;
            const targetRow = curRow + ndy;
            const wrappedTargetCol = ((targetCol % COLS) + COLS) % COLS;
            if (isPassableForCat(targetCol, targetRow, canAutoSmash)) {
              if (
                canAutoSmash &&
                grid[targetRow]?.[wrappedTargetCol] === TileType.DESTRUCTIBLE
              ) {
                damageOrBreakWall(cat, targetRow, wrappedTargetCol, true);
              }
              cat.x = centerX;
              cat.y = centerY;
              cat.dir = cat.nextDir;
              cat.nextDir = 'NONE';
            } else if (
              grid[targetRow]?.[wrappedTargetCol] === TileType.DESTRUCTIBLE
            ) {
              damageOrBreakWall(cat, targetRow, wrappedTargetCol, false);
            }
          }
        }
      }

      const { dx, dy } = dirToVec(cat.dir);
      const step = forwardActive ? speed * dt : 0;
      let nextX = cat.x + dx * step;
      let nextY = cat.y + dy * step;

      if (step > 0) {
        if (dx !== 0) {
          nextY += (centerY - nextY) * Math.min(1, dt * 16);
        } else if (dy !== 0) {
          nextX += (centerX - nextX) * Math.min(1, dt * 16);
        }

        const lookCol = Math.floor((nextX + dx * (TILE * 0.46)) / TILE);
        const lookRow = Math.floor((nextY + dy * (TILE * 0.46)) / TILE);
        const wrappedLookCol = ((lookCol % COLS) + COLS) % COLS;

        if (lookRow >= 0 && lookRow < ROWS) {
          const aheadTile = grid[lookRow][wrappedLookCol];
          if (aheadTile === TileType.DESTRUCTIBLE) {
            if (canAutoSmash) {
              damageOrBreakWall(cat, lookRow, wrappedLookCol, true);
            } else {
              damageOrBreakWall(cat, lookRow, wrappedLookCol, false);
              nextX = centerX;
              nextY = centerY;
            }
          } else if (!isPassableForCat(lookCol, lookRow, canAutoSmash)) {
            nextX = centerX;
            nextY = centerY;
          }
        }
      }

      if (nextX < 0) nextX += CANVAS_W;
      if (nextX >= CANVAS_W) nextX -= CANVAS_W;

      const prevCatX = cat.x;
      const prevCatY = cat.y;
      cat.x = nextX;
      cat.y = nextY;
      if (cat.dir !== 'NONE') {
        cat.facingDir = cat.dir;
      }
      if (Math.hypot(cat.x - prevCatX, cat.y - prevCatY) > 0.2) {
        cat.headBobPhase += dt * (isSpeed ? 13 : 8.5);
      }

      if (isSpeed || isGiant || isGhost) {
        const trailColor = isGhost
          ? 'rgba(56, 189, 248, 0.24)'
          : isGiant
          ? 'rgba(251, 191, 36, 0.22)'
          : profilesRef.current[cat.playerNumber - 1].skin.primaryColor + '38';
        cat.trail.push({ x: cat.x, y: cat.y, color: trailColor });
        if (cat.trail.length > 7) cat.trail.shift();
      } else if (cat.trail.length > 0) {
        cat.trail.shift();
      }

      // Pickup collection
      const pickupRow = Math.floor(cat.y / TILE);
      const pickupCol = ((Math.floor(cat.x / TILE) % COLS) + COLS) % COLS;

      if (pickupRow >= 0 && pickupRow < ROWS) {
        const tile = grid[pickupRow][pickupCol];
        const tx = (pickupCol + 0.5) * TILE;
        const ty = (pickupRow + 0.5) * TILE;

        if (tile === TileType.PELLET) {
          grid[pickupRow][pickupCol] = TileType.EMPTY;
          pelletsRemaining--;
          const pts = 10 * cat.multiplier;
          cat.score += pts;
          cat.roundScore += pts;
          soundEngine.playPellet();

          const nearMouse = mice.some(
            (m) =>
              m.squashedTimer <= 0 &&
              Math.hypot(m.x - cat.x, m.y - cat.y) < TILE * 5.2
          );
          if (nearMouse) {
            cat.chaseHeat = Math.min(100, cat.chaseHeat + 5);
            cat.chaseGrace = 1.6;
          }
        } else if (tile === TileType.GIANT_ORB) {
          grid[pickupRow][pickupCol] = TileType.EMPTY;
          pelletsRemaining--;
          cat.giantTimer = GIANT_DURATION;
          cat.squashStreak = 0;
          const pts = 50 * cat.multiplier;
          cat.score += pts;
          cat.roundScore += pts;
          cat.chaseHeat = Math.min(100, cat.chaseHeat + 22);
          cat.chaseGrace = 2.0;
          soundEngine.playGiantPowerUp();
          triggerHaptics(0.55, 85);
          spawnParticles(tx, ty, '#FBBF24', 18, 190);
          spawnFloatingText(tx, ty - 14, 'GIANT CAT! 10s', '#FBBF24', 1.25);
          shakeTimer = 0.18;
          shakeIntensity = 4;
        } else if (tile === TileType.SPEED_BOOST) {
          grid[pickupRow][pickupCol] = TileType.EMPTY;
          cat.speedTimer = SPEED_DURATION;
          const pad = speedPads.find(
            (p) => p.row === pickupRow && p.col === pickupCol
          );
          if (pad) pad.respawnTimer = SPEED_RESPAWN_TIME;
          const pts = 30 * cat.multiplier;
          cat.score += pts;
          cat.roundScore += pts;
          soundEngine.playSpeedBoost();
          triggerHaptics(0.4, 65);
          spawnParticles(tx, ty, '#10B981', 14, 170);
          spawnFloatingText(tx, ty - 12, 'ZOOMIES!', '#34D399', 1.1);
        } else if (tile === TileType.GHOST_ORB) {
          grid[pickupRow][pickupCol] = TileType.EMPTY;
          cat.ghostTimer = GHOST_DURATION;
          cat.stickyTimer = 0; // Ghost mode clears sticky slow
          const pts = 40 * cat.multiplier;
          cat.score += pts;
          cat.roundScore += pts;
          soundEngine.playGhostMode();
          triggerHaptics(0.45, 70);
          spawnParticles(tx, ty, '#38BDF8', 16, 170);
          spawnFloatingText(tx, ty - 14, 'GHOST MODE! 7s', '#38BDF8', 1.18);
        }
      }
    };

    const updateChaseHeat = (cat: CatEntity, dt: number) => {
      if (!cat.alive) return;

      let closestDist = Infinity;
      let closeMiceCount = 0;
      for (const m of mice) {
        if (m.squashedTimer > 0) continue;
        const d = Math.hypot(m.x - cat.x, m.y - cat.y);
        if (d < closestDist) closestDist = d;
        if (d < TILE * 4.5) closeMiceCount++;
      }

      const prevMult = cat.multiplier;

      if (
        closestDist < TILE * 4.2 ||
        (cat.giantTimer > 0 && closestDist < TILE * 6.0)
      ) {
        const proximityFactor = Math.max(0.25, 1 - closestDist / (TILE * 5.8));
        const gainRate = (26 + closeMiceCount * 14) * proximityFactor;
        cat.chaseHeat = Math.min(100, cat.chaseHeat + gainRate * dt);
        cat.chaseGrace = 1.5;
      } else if (cat.chaseGrace > 0) {
        cat.chaseGrace = Math.max(0, cat.chaseGrace - dt);
      } else {
        cat.chaseHeat = Math.max(0, cat.chaseHeat - 16 * dt);
      }

      cat.multiplier = getMultiplierFromHeat(cat.chaseHeat);
      if (cat.multiplier > prevMult) {
        const labels: Record<number, string> = {
          2: '2x CHASE!',
          3: '3x FRENZY!',
          4: '4x MAYHEM!',
          5: '5x ULTRA CHASE!',
        };
        const label = labels[cat.multiplier] || `${cat.multiplier}x!`;
        spawnFloatingText(cat.x, cat.y - 24, label, '#FDE047', 1.15);
      }
    };

    const chooseMouseDir = (mouse: MouseEntity, anyGiant: boolean): Direction => {
      const col = ((Math.floor(mouse.x / TILE) % COLS) + COLS) % COLS;
      const row = Math.floor(mouse.y / TILE);
      const currentTile = grid[row]?.[col];
      const inNest =
        currentTile === TileType.MOUSE_NEST ||
        currentTile === TileType.NEST_GATE;

      const allDirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const validDirs = allDirs.filter((d) => {
        if (isOppositeDir(d, mouse.dir)) return false;
        const { dx, dy } = dirToVec(d);
        const nc = col + dx;
        const nr = row + dy;
        if (!isPassableForMouse(nc, nr)) return false;
        if (
          !inNest &&
          grid[nr]?.[((nc % COLS) + COLS) % COLS] === TileType.NEST_GATE
        ) {
          return false;
        }
        return true;
      });

      const candidates =
        validDirs.length > 0
          ? validDirs
          : allDirs.filter((d) => {
              const { dx, dy } = dirToVec(d);
              return isPassableForMouse(col + dx, row + dy);
            });

      if (candidates.length === 0) return mouse.dir;

      let targetX = cats[0].x;
      let targetY = cats[0].y;
      let fleeMode = false;

      if (inNest) {
        targetX = 11.5 * TILE;
        targetY = 4.5 * TILE;
      } else if (anyGiant) {
        const giantCats = cats.filter((c) => c.alive && c.giantTimer > 0);
        if (giantCats.length > 0) {
          fleeMode = true;
          let nearestGiant = giantCats[0];
          let minD = Infinity;
          for (const gc of giantCats) {
            const d = Math.hypot(gc.x - mouse.x, gc.y - mouse.y);
            if (d < minD) {
              minD = d;
              nearestGiant = gc;
            }
          }
          targetX = nearestGiant.x;
          targetY = nearestGiant.y;
        }
      } else {
        // Check if a Sticky Paws pickup is nearby for the mouse to grab
        let stickyTarget: { x: number; y: number } | null = null;
        if (mouse.stickyPawsTimer <= 0) {
          let bestStickyD = TILE * 4.5;
          for (let r = 1; r < ROWS - 1; r++) {
            for (let c = 1; c < COLS - 1; c++) {
              if (grid[r][c] === TileType.STICKY_PAWS) {
                const sx = (c + 0.5) * TILE;
                const sy = (r + 0.5) * TILE;
                const d = Math.hypot(sx - mouse.x, sy - mouse.y);
                if (d < bestStickyD) {
                  bestStickyD = d;
                  stickyTarget = { x: sx, y: sy };
                }
              }
            }
          }
        }

        if (stickyTarget) {
          targetX = stickyTarget.x;
          targetY = stickyTarget.y;
        } else {
          const aliveCats = cats.filter((c) => c.alive);
          if (aliveCats.length > 0) {
            let chosen = aliveCats[0];
            if (aliveCats.length === 2) {
              const d0 = Math.hypot(
                aliveCats[0].x - mouse.x,
                aliveCats[0].y - mouse.y
              );
              const d1 = Math.hypot(
                aliveCats[1].x - mouse.x,
                aliveCats[1].y - mouse.y
              );
              if (mouse.behavior === 'flanker') {
                chosen =
                  Math.floor(roundTimeElapsed / 8) % 2 === 0
                    ? aliveCats[0]
                    : aliveCats[1];
              } else {
                chosen = d0 <= d1 ? aliveCats[0] : aliveCats[1];
              }
            }
            if (mouse.behavior === 'ambusher') {
              const { dx, dy } = dirToVec(chosen.dir);
              targetX = chosen.x + dx * TILE * 3;
              targetY = chosen.y + dy * TILE * 3;
            } else if (
              mouse.behavior === 'opportunist' &&
              Math.random() < 0.25
            ) {
              targetX = (COLS / 2) * TILE;
              targetY = (ROWS / 2) * TILE;
            } else {
              targetX = chosen.x;
              targetY = chosen.y;
            }
          }
        }
      }

      let bestDir = candidates[0];
      let bestScore = fleeMode ? -Infinity : Infinity;

      for (const d of candidates) {
        const { dx, dy } = dirToVec(d);
        const nx = (col + dx + 0.5) * TILE;
        const ny = (row + dy + 0.5) * TILE;
        const dist = Math.hypot(nx - targetX, ny - targetY);
        const jitter = Math.random() * 6;
        if (fleeMode) {
          if (dist + jitter > bestScore) {
            bestScore = dist + jitter;
            bestDir = d;
          }
        } else {
          if (dist + jitter < bestScore) {
            bestScore = dist + jitter;
            bestDir = d;
          }
        }
      }

      return bestDir;
    };

    const updateMouse = (mouse: MouseEntity, dt: number, anyGiant: boolean) => {
      if (mouse.squashedTimer > 0) {
        mouse.squashedTimer -= dt;
        if (mouse.squashedTimer <= 0) {
          mouse.x = mouse.spawnX;
          mouse.y = mouse.spawnY;
          mouse.dir = 'UP';
          mouse.stickyPawsTimer = 0;
          mouse.lastTurnRow = -1;
          mouse.lastTurnCol = -1;
          mouse.exitDelay = 0.6;
        }
        return;
      }

      if (mouse.exitDelay > 0) {
        mouse.exitDelay -= dt;
        return;
      }

      if (mouse.stickyPawsTimer > 0) {
        mouse.stickyPawsTimer = Math.max(0, mouse.stickyPawsTimer - dt);
        mouse.puddleDropTimer -= dt;
        if (mouse.puddleDropTimer <= 0) {
          mouse.puddleDropTimer = 0.42;
          stickyPuddles.push({
            x: mouse.x,
            y: mouse.y,
            life: 5.0,
            maxLife: 5.0,
          });
        }
      }

      const inFirstPersonView =
        playerCount === 1 && viewModeRef.current !== 'top_down';
      const fpMouseFactor = inFirstPersonView ? 0.74 : 1;
      const speed =
        (anyGiant ? baseMouseSpeed * 0.84 : baseMouseSpeed) * fpMouseFactor;
      let remaining = speed * dt;

      let curCol = ((Math.floor(mouse.x / TILE) % COLS) + COLS) % COLS;
      let curRow = Math.floor(mouse.y / TILE);
      let centerX = (curCol + 0.5) * TILE;
      let centerY = (curRow + 0.5) * TILE;

      // If starting right on a tile center we haven't turned on yet, decide direction now
      if (
        (mouse.lastTurnRow !== curRow || mouse.lastTurnCol !== curCol) &&
        Math.hypot(mouse.x - centerX, mouse.y - centerY) < 1.5
      ) {
        mouse.x = centerX;
        mouse.y = centerY;
        mouse.dir = chooseMouseDir(mouse, anyGiant);
        mouse.lastTurnRow = curRow;
        mouse.lastTurnCol = curCol;
      }

      const { dx, dy } = dirToVec(mouse.dir);
      const prevDist = (mouse.x - centerX) * dx + (mouse.y - centerY) * dy;
      let nextX = mouse.x + dx * remaining;
      let nextY = mouse.y + dy * remaining;
      const newDist = (nextX - centerX) * dx + (nextY - centerY) * dy;

      // Crossed strictly from before the center to at/past the center -> turn cleanly & use overshoot
      if (
        prevDist < 0 &&
        newDist >= 0 &&
        (mouse.lastTurnRow !== curRow || mouse.lastTurnCol !== curCol)
      ) {
        mouse.x = centerX;
        mouse.y = centerY;
        mouse.dir = chooseMouseDir(mouse, anyGiant);
        mouse.lastTurnRow = curRow;
        mouse.lastTurnCol = curCol;
        const { dx: ndx, dy: ndy } = dirToVec(mouse.dir);
        remaining = Math.max(0, newDist);
        nextX = centerX + ndx * remaining;
        nextY = centerY + ndy * remaining;
      } else {
        const aheadCol = curCol + dx;
        const aheadRow = curRow + dy;
        if (!isPassableForMouse(aheadCol, aheadRow) && newDist >= 0) {
          nextX = centerX;
          nextY = centerY;
          mouse.dir = chooseMouseDir(mouse, anyGiant);
          mouse.lastTurnRow = curRow;
          mouse.lastTurnCol = curCol;
        }
      }

      if (nextX < 0) nextX += CANVAS_W;
      if (nextX >= CANVAS_W) nextX -= CANVAS_W;

      mouse.x = nextX;
      mouse.y = nextY;

      // Check if mouse picked up a Sticky Paws token in the maze
      const mRow = Math.floor(mouse.y / TILE);
      const mCol = ((Math.floor(mouse.x / TILE) % COLS) + COLS) % COLS;
      if (mRow >= 0 && mRow < ROWS && grid[mRow][mCol] === TileType.STICKY_PAWS) {
        grid[mRow][mCol] = TileType.EMPTY;
        mouse.stickyPawsTimer = STICKY_MOUSE_DURATION;
        mouse.puddleDropTimer = 0.05;
        soundEngine.playStickyPaws();
        spawnParticles(mouse.x, mouse.y, '#E879F9', 12, 140);
        spawnFloatingText(mouse.x, mouse.y - 14, 'STICKY PAWS!', '#E879F9', 1.0);
      }
    };

    const handleCollisions = () => {
      // Cat vs Sticky Puddles
      for (const cat of cats) {
        if (!cat.alive || cat.ghostTimer > 0) continue;
        for (const puddle of stickyPuddles) {
          if (Math.hypot(cat.x - puddle.x, cat.y - puddle.y) < TILE * 0.52) {
            applyStickySlowToCat(cat, 'STICKY! -45% SPD');
            break;
          }
        }
      }

      // Cat vs Mouse
      for (const cat of cats) {
        if (!cat.alive) continue;
        const isGiant = cat.giantTimer > 0;
        const isGhost = cat.ghostTimer > 0;
        const hitRadius = isGiant ? TILE * 0.78 : TILE * 0.52;

        for (const mouse of mice) {
          if (mouse.squashedTimer > 0 || mouse.exitDelay > 0) continue;
          const dist = Math.hypot(cat.x - mouse.x, cat.y - mouse.y);

          // Sticky aura slows nearby cats even on close brush
          if (
            mouse.stickyPawsTimer > 0 &&
            !isGhost &&
            dist < TILE * 0.92 &&
            dist >= hitRadius
          ) {
            applyStickySlowToCat(cat, 'STICKY PAWS!');
          }

          if (dist < hitRadius) {
            if (isGiant) {
              // SQUASH THE MOUSE!
              mouse.squashedTimer = 1.65;
              const wasSticky = mouse.stickyPawsTimer > 0;
              mouse.stickyPawsTimer = 0;
              cat.squashStreak++;
              cat.miceSquashedThisRound++;
              cat.chaseHeat = Math.min(100, cat.chaseHeat + 28);
              cat.chaseGrace = 2.0;
              cat.multiplier = getMultiplierFromHeat(cat.chaseHeat);
              const pts = Math.round(
                250 * cat.multiplier * (1 + (cat.squashStreak - 1) * 0.5)
              );
              cat.score += pts;
              cat.roundScore += pts;
              soundEngine.playSquashMouse(cat.squashStreak);
              triggerHaptics(0.9, 140);
              spawnParticles(mouse.x, mouse.y, '#FBBF24', 18, 210);
              spawnParticles(mouse.x, mouse.y, '#F472B6', 10, 140);
              spawnFloatingText(
                mouse.x,
                mouse.y - 16,
                cat.squashStreak > 1
                  ? `SQUASH x${cat.squashStreak}! +${pts}`
                  : `SQUASH! +${pts}`,
                '#FACC15',
                1.25
              );
              shakeTimer = 0.2;
              shakeIntensity = 5.5;
              if (wasSticky && !isGhost) {
                applyStickySlowToCat(cat, 'STICKY SQUASH!');
              }
            } else if (isGhost) {
              // Ghost Mode: invincible phase-through!
              if (!cat.phaseCooldowns[mouse.id]) {
                cat.phaseCooldowns[mouse.id] = 1.0;
                const pts = 25 * cat.multiplier;
                cat.score += pts;
                cat.roundScore += pts;
                cat.chaseHeat = Math.min(100, cat.chaseHeat + 14);
                cat.chaseGrace = 1.6;
                spawnParticles(cat.x, cat.y, '#38BDF8', 8, 110);
                spawnFloatingText(cat.x, cat.y - 14, `PHASE! +${pts}`, '#38BDF8', 0.95);
              }
            } else if (cat.invulnerableTimer <= 0) {
              // Normal Cat caught by mouse!
              if (mouse.stickyPawsTimer > 0) {
                applyStickySlowToCat(cat, 'STICKY PAWS!');
              }
              cat.lives -= 1;
              cat.chaseHeat = 0;
              cat.multiplier = 1;
              cat.speedTimer = 0;
              soundEngine.playCatHit();
              triggerHaptics(1.0, 220);
              spawnParticles(cat.x, cat.y, '#EF4444', 18, 170);
              spawnFloatingText(cat.x, cat.y - 14, 'CAUGHT!', '#F87171', 1.15);
              shakeTimer = 0.22;
              shakeIntensity = 5;

              if (cat.lives <= 0) {
                cat.alive = false;
                if (playerCount === 1) {
                  finishRound(
                    'SOLO_LOSS',
                    `${profilesRef.current[0].name} ran out of lives!`
                  );
                } else {
                  const survivor =
                    cats[0].playerNumber === cat.playerNumber
                      ? cats[1]
                      : cats[0];
                  if (survivor.alive) {
                    survivor.score += 500;
                    survivor.roundScore += 500;
                    finishRound(
                      survivor.playerNumber,
                      `${profilesRef.current[survivor.playerNumber - 1].name} outlasted the mice!`
                    );
                  } else {
                    finishRound('DRAW', 'Both cats ran out of lives!');
                  }
                }
                return;
              } else {
                cat.x = cat.spawnX;
                cat.y = cat.spawnY;
                const resetDir: Direction =
                  cat.playerNumber === 1 ? 'RIGHT' : 'LEFT';
                cat.dir = resetDir;
                cat.facingDir = resetDir;
                cat.camAngle = dirToAngle(resetDir);
                cat.nextDir = 'NONE';
                cat.invulnerableTimer = 2.6;
              }
            }
          }
        }
      }

      // Competitive Giant Cat vs Normal Cat playful BOOP!
      if (cats[0].alive && cats[1].alive) {
        const c1Giant = cats[0].giantTimer > 0;
        const c2Giant = cats[1].giantTimer > 0;
        if (c1Giant !== c2Giant) {
          const giant = c1Giant ? cats[0] : cats[1];
          const small = c1Giant ? cats[1] : cats[0];
          if (
            small.ghostTimer <= 0 &&
            small.stunTimer <= 0 &&
            small.invulnerableTimer <= 0
          ) {
            const d = Math.hypot(giant.x - small.x, giant.y - small.y);
            if (d < TILE * 0.88) {
              small.stunTimer = 0.6;
              small.invulnerableTimer = 1.2;
              giant.score += 50;
              giant.roundScore += 50;
              soundEngine.playBoop();
              spawnParticles(small.x, small.y, '#FBBF24', 10, 120);
              spawnFloatingText(
                small.x,
                small.y - 14,
                'BOOP! +50',
                '#FDE047',
                1.0
              );
            }
          }
        }
      }
    };

    const drawMaze = (time: number) => {
      ctx.fillStyle = '#090C18';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.04)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * TILE, 0);
        ctx.lineTo(c * TILE, CANVAS_H);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * TILE);
        ctx.lineTo(CANVAS_W, r * TILE);
        ctx.stroke();
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = grid[r][c];
          const x = c * TILE;
          const y = r * TILE;
          const cx = x + TILE / 2;
          const cy = y + TILE / 2;

          if (tile === TileType.WALL) {
            ctx.fillStyle = '#141B33';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);

            ctx.strokeStyle = maze.wallAccent;
            ctx.lineWidth = 2;
            const nUp = r > 0 && grid[r - 1][c] === TileType.WALL;
            const nDown = r < ROWS - 1 && grid[r + 1][c] === TileType.WALL;
            const nLeft = c > 0 && grid[r][c - 1] === TileType.WALL;
            const nRight = c < COLS - 1 && grid[r][c + 1] === TileType.WALL;

            ctx.beginPath();
            if (!nUp) {
              ctx.moveTo(x + 3, y + 3);
              ctx.lineTo(x + TILE - 3, y + 3);
            }
            if (!nDown) {
              ctx.moveTo(x + 3, y + TILE - 3);
              ctx.lineTo(x + TILE - 3, y + TILE - 3);
            }
            if (!nLeft) {
              ctx.moveTo(x + 3, y + 3);
              ctx.lineTo(x + 3, y + TILE - 3);
            }
            if (!nRight) {
              ctx.moveTo(x + TILE - 3, y + 3);
              ctx.lineTo(x + TILE - 3, y + TILE - 3);
            }
            ctx.stroke();
          } else if (tile === TileType.DESTRUCTIBLE) {
            const hp = wallHp[r][c];
            ctx.fillStyle = hp === 2 ? '#78350F' : '#9A3412';
            ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
            ctx.strokeStyle = hp === 2 ? '#F59E0B' : '#FB923C';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);

            ctx.strokeStyle = 'rgba(9, 11, 20, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 4, cy);
            ctx.lineTo(x + TILE - 4, cy);
            ctx.moveTo(cx, y + 4);
            ctx.lineTo(cx, cy);
            ctx.moveTo(x + TILE * 0.3, cy);
            ctx.lineTo(x + TILE * 0.3, y + TILE - 4);
            ctx.moveTo(x + TILE * 0.72, cy);
            ctx.lineTo(x + TILE * 0.72, y + TILE - 4);
            ctx.stroke();

            if (hp === 1) {
              ctx.strokeStyle = '#FEF08A';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + 8, y + 8);
              ctx.lineTo(cx + 2, cy - 2);
              ctx.lineTo(cx - 4, cy + 5);
              ctx.lineTo(x + TILE - 8, y + TILE - 8);
              ctx.stroke();
            }
          } else if (tile === TileType.NEST_GATE) {
            ctx.fillStyle = 'rgba(244, 114, 182, 0.32)';
            ctx.fillRect(x, cy - 3, TILE, 6);
            ctx.fillStyle = '#F472B6';
            ctx.fillRect(x + 2, cy - 1.5, TILE - 4, 3);
          } else if (tile === TileType.MOUSE_NEST) {
            ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
            ctx.fillRect(x, y, TILE, TILE);
          } else if (tile === TileType.PELLET) {
            ctx.beginPath();
            ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
            ctx.fillStyle = '#FDE68A';
            ctx.fill();
          } else if (tile === TileType.GIANT_ORB) {
            const pulse = 1 + Math.sin(time * 7) * 0.18;
            ctx.beginPath();
            ctx.arc(cx, cy, 11 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 7.5 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#FBBF24';
            ctx.fill();
            ctx.strokeStyle = '#FEF3C7';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            ctx.fillStyle = '#090B14';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', cx, cy + 0.5);
          } else if (tile === TileType.SPEED_BOOST) {
            const hover = Math.sin(time * 6) * 2;
            ctx.beginPath();
            ctx.arc(cx, cy + hover, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(cx + 2, cy - 9 + hover);
            ctx.lineTo(cx - 5, cy + 1 + hover);
            ctx.lineTo(cx, cy + 1 + hover);
            ctx.lineTo(cx - 2, cy + 9 + hover);
            ctx.lineTo(cx + 5, cy - 1 + hover);
            ctx.lineTo(cx, cy - 1 + hover);
            ctx.closePath();
            ctx.fillStyle = '#34D399';
            ctx.fill();
            ctx.strokeStyle = '#ECFDF5';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (tile === TileType.GHOST_ORB) {
            // Cyan spectral Ghost Mode Orb
            const bob = Math.sin(time * 5.5) * 2;
            ctx.beginPath();
            ctx.arc(cx, cy + bob, 11, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
            ctx.fill();

            // Mini spectral ghost silhouette
            ctx.beginPath();
            ctx.arc(cx, cy - 1 + bob, 6.5, Math.PI, 0);
            ctx.lineTo(cx + 6.5, cy + 7 + bob);
            ctx.lineTo(cx + 2.5, cy + 4.5 + bob);
            ctx.lineTo(cx, cy + 7 + bob);
            ctx.lineTo(cx - 2.5, cy + 4.5 + bob);
            ctx.lineTo(cx - 6.5, cy + 7 + bob);
            ctx.closePath();
            ctx.fillStyle = '#38BDF8';
            ctx.fill();
            ctx.strokeStyle = '#E0F2FE';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = '#090B14';
            ctx.fillRect(cx - 3, cy - 2 + bob, 2, 2);
            ctx.fillRect(cx + 1, cy - 2 + bob, 2, 2);
          } else if (tile === TileType.STICKY_PAWS) {
            // Magenta-amber Sticky Paws pickup (for mice!)
            const pulse = 1 + Math.sin(time * 6) * 0.14;
            ctx.beginPath();
            ctx.arc(cx, cy, 10 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(217, 70, 239, 0.22)';
            ctx.fill();

            // Cute sticky pawprint icon
            ctx.fillStyle = '#E879F9';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2.5, 5.2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            for (const [ox, oy] of [
              [-5, -3],
              [-1.8, -5.2],
              [1.8, -5.2],
              [5, -3],
            ]) {
              ctx.beginPath();
              ctx.arc(cx + ox, cy + oy, 1.9, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw Sticky Puddles dropped by Sticky-Pawed mice
      for (const puddle of stickyPuddles) {
        const alpha = Math.min(0.75, (puddle.life / puddle.maxLife) * 0.85);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#D946EF';
        ctx.beginPath();
        ctx.ellipse(puddle.x, puddle.y + 3, 9, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F5D0FE';
        ctx.beginPath();
        ctx.arc(puddle.x - 3, puddle.y + 2, 2, 0, Math.PI * 2);
        ctx.arc(puddle.x + 3, puddle.y + 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Speed Pad Respawn Rings
      for (const pad of speedPads) {
        if (pad.respawnTimer > 0) {
          const cx = (pad.col + 0.5) * TILE;
          const cy = (pad.row + 0.5) * TILE;
          const pct = 1 - pad.respawnTimer / SPEED_RESPAWN_TIME;
          ctx.beginPath();
          ctx.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    };

    const questInputCallbacks = {
      onDirection: (dir: Direction, isTurnGated: boolean) => {
        applyDirectionInput(1, dir, isTurnGated);
      },
      onForwardHold: (holding: boolean) => {
        fpGamepadForwardHeld = holding;
      },
      onTogglePause: () => {
        onTogglePauseRef.current();
      },
      onRecenterHead: () => {
        headYawOffset = 0;
        spawnFloatingText(cats[0].x, cats[0].y - 18, 'CENTERED', '#38BDF8', 0.9);
      },
      onExitVR: () => {
        onQuestVRActiveChangeRef.current?.(false);
      },
    };

    const stepSimulation = (dt: number) => {
      if (!questXR) {
        const inFirstPerson =
          playerCount === 1 && viewModeRef.current !== 'top_down';
        gamepadPoller.poll(questInputCallbacks, inFirstPerson);
      }

      // Smoothly track 1st-person/VR camera angle toward cat's facing direction
      const targetAngle = dirToAngle(cats[0].facingDir);
      const angleDiff = Math.atan2(
        Math.sin(targetAngle - cats[0].camAngle),
        Math.cos(targetAngle - cats[0].camAngle)
      );
      cats[0].camAngle += angleDiff * Math.min(1, dt * 14);

      if (gameStateRef.current !== 'PLAYING' || roundEnded) {
        return;
      }

      roundTimeElapsed += dt;

      // Respawn speed pads
      for (const pad of speedPads) {
        if (pad.respawnTimer > 0) {
          pad.respawnTimer -= dt;
          if (pad.respawnTimer <= 0) {
            pad.respawnTimer = 0;
            grid[pad.row][pad.col] = TileType.SPEED_BOOST;
            spawnParticles(
              (pad.col + 0.5) * TILE,
              (pad.row + 0.5) * TILE,
              '#34D399',
              8,
              80
            );
          }
        }
      }

      // Periodically distribute new random Ghost Mode / Sticky Paws pickups
      randomPowerupTimer -= dt;
      if (randomPowerupTimer <= 0) {
        randomPowerupTimer = RANDOM_POWERUP_RESPAWN_TIME;
        let ghostCount = 0;
        let stickyCount = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === TileType.GHOST_ORB) ghostCount++;
            if (grid[r][c] === TileType.STICKY_PAWS) stickyCount++;
          }
        }
        if (ghostCount < 2) spawnRandomPowerUp(TileType.GHOST_ORB, false);
        if (stickyCount < 2) spawnRandomPowerUp(TileType.STICKY_PAWS, false);
      }

      // Update Sticky Puddles
      for (let i = stickyPuddles.length - 1; i >= 0; i--) {
        stickyPuddles[i].life -= dt;
        if (stickyPuddles[i].life <= 0) stickyPuddles.splice(i, 1);
      }

      updateCat(cats[0], dt);
      updateCat(cats[1], dt);

      updateChaseHeat(cats[0], dt);
      updateChaseHeat(cats[1], dt);

      const anyGiant = cats[0].giantTimer > 0 || cats[1].giantTimer > 0;
      for (const mouse of mice) {
        updateMouse(mouse, dt, anyGiant);
      }

      handleCollisions();

      if (pelletsRemaining <= 0 && !roundEnded) {
        if (playerCount === 1) {
          finishRound(1, 'All kibble pellets cleared!');
        } else {
          let winner: 1 | 2 | 'DRAW' = 'DRAW';
          if (cats[0].roundScore > cats[1].roundScore) winner = 1;
          else if (cats[1].roundScore > cats[0].roundScore) winner = 2;
          finishRound(winner, 'All kibble pellets cleared!');
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 28 * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }

      if (shakeTimer > 0) {
        shakeTimer = Math.max(0, shakeTimer - dt);
      }

      hudEmitTimer += dt;
      if (hudEmitTimer >= 0.08) {
        hudEmitTimer = 0;
        emitHud();
      }
    };

    const enterQuestVR = async () => {
      if (questXR) {
        await questXR.end();
        questXR = null;
        headYawOffset = 0;
        onQuestVRActiveChangeRef.current?.(false);
        onQuestVRStatusRef.current?.('Exited Meta Quest WebXR');
        return;
      }
      try {
        onQuestVRStatusRef.current?.('Starting Meta Quest WebXR...');
        questXR = await launchQuestImmersiveVR({
          eyeWidth: 720,
          eyeHeight: 680,
          callbacks: questInputCallbacks,
          onStepAndDrawEye: (dt, eyeIndex, xrHeadYaw, eyeCanvas) => {
            headYawOffset = xrHeadYaw;
            if (dt > 0) {
              stepSimulation(dt);
            }
            const eyeCtx = eyeCanvas.getContext('2d');
            if (!eyeCtx) return;
            renderSingleVREyeCanvas(
              {
                ctx: eyeCtx,
                canvasW: eyeCanvas.width,
                canvasH: eyeCanvas.height,
                cols: COLS,
                rows: ROWS,
                tileSize: TILE,
                grid,
                wallHp,
                maze,
                cat: {
                  ...cats[0],
                  score: cats[0].score,
                  lives: cats[0].lives,
                },
                profile: profilesRef.current[0],
                mice,
                puddles: stickyPuddles,
                speedPads,
                particles,
                floatingTexts,
                timeSec: performance.now() / 1000,
                headBob: Math.sin(cats[0].headBobPhase) * 3.5,
                headYawOffset,
                pelletsRemaining,
              },
              eyeIndex
            );
          },
          onSessionEnd: () => {
            questXR = null;
            headYawOffset = 0;
            onQuestVRActiveChangeRef.current?.(false);
            onQuestVRStatusRef.current?.('');
          },
        });
        onQuestVRActiveChangeRef.current?.(true);
        onQuestVRStatusRef.current?.('Meta Quest WebXR active');
      } catch {
        questXR = null;
        onQuestVRActiveChangeRef.current?.(false);
        onQuestVRStatusRef.current?.(
          'WebXR headset not detected — VR Stereo & Quest/Gamepad sticks still active'
        );
      }
    };

    onRegisterQuestVRRef.current?.(enterQuestVR);

    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const timeSec = now / 1000;

      stepSimulation(dt);

      const isFirstPersonOrVR =
        playerCount === 1 && viewModeRef.current !== 'top_down';
      const isStereoVR =
        playerCount === 1 && viewModeRef.current === 'vr_stereo';
      const aspect = isStereoVR
        ? Math.max(0.45, Math.min(2.8, vrCanvasAspectRef.current || 1.77))
        : CANVAS_W / CANVAS_H;
      const renderW = isStereoVR
        ? aspect >= 1
          ? Math.round(520 * aspect)
          : 520
        : CANVAS_W;
      const renderH = isStereoVR
        ? aspect >= 1
          ? 520
          : Math.round(520 / aspect)
        : CANVAS_H;
      const dpr = isFirstPersonOrVR
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : window.devicePixelRatio || 1;
      const targetW = Math.round(renderW * dpr);
      const targetH = Math.round(renderH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();

      if (shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * shakeIntensity * 2;
        const sy = (Math.random() - 0.5) * shakeIntensity * 2;
        ctx.translate(sx, sy);
      }

      if (playerCount === 1 && viewModeRef.current !== 'top_down') {
        renderFirstPersonMazeView({
          ctx,
          canvasW: renderW,
          canvasH: renderH,
          cols: COLS,
          rows: ROWS,
          tileSize: TILE,
          grid,
          wallHp,
          maze,
          cat: cats[0],
          profile: profilesRef.current[0],
          mice,
          puddles: stickyPuddles,
          speedPads,
          particles,
          floatingTexts,
          timeSec,
          viewMode: viewModeRef.current,
          headBob: Math.sin(cats[0].headBobPhase) * 3.5,
          headYawOffset,
        });
        ctx.restore();
        rafId = requestAnimationFrame(tick);
        return;
      }

      drawMaze(timeSec);

      // Draw Cat Trails
      for (const cat of cats) {
        if (!cat.alive) continue;
        cat.trail.forEach((tr, idx) => {
          const ratio = (idx + 1) / cat.trail.length;
          ctx.beginPath();
          ctx.arc(
            tr.x,
            tr.y,
            TILE * (cat.giantTimer > 0 ? 0.56 : 0.34) * ratio,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = tr.color;
          ctx.fill();
        });
      }

      // Draw Mice
      const anyGiant = cats[0].giantTimer > 0 || cats[1].giantTimer > 0;
      for (const mouse of mice) {
        drawMouseSprite(ctx, {
          x: mouse.x,
          y: mouse.y,
          radius: TILE * 0.4,
          furColor: mouse.furColor,
          earInnerColor: mouse.earInnerColor,
          dir: mouse.dir,
          time: timeSec,
          isPanicked: anyGiant && mouse.squashedTimer <= 0,
          isSquashed: mouse.squashedTimer > 0,
          isStickyPaws: mouse.stickyPawsTimer > 0,
        });
      }

      // Draw Cats
      const orderedCats = [...cats].sort(
        (a, b) => (a.giantTimer > 0 ? 1 : 0) - (b.giantTimer > 0 ? 1 : 0)
      );
      for (const cat of orderedCats) {
        if (!cat.alive) continue;
        const skin = profilesRef.current[cat.playerNumber - 1].skin;
        drawCatSprite(ctx, {
          x: cat.x,
          y: cat.y,
          radius: TILE * 0.42,
          skin,
          dir: cat.dir,
          time: timeSec,
          isGiant: cat.giantTimer > 0,
          giantTimer: cat.giantTimer,
          isSpeedBoost: cat.speedTimer > 0,
          isGhost: cat.ghostTimer > 0,
          ghostTimer: cat.ghostTimer,
          isStickySlowed: cat.stickyTimer > 0,
          invulnerableTimer: cat.invulnerableTimer,
          stunTimer: cat.stunTimer,
          playerNumber: cat.playerNumber,
        });

        ctx.fillStyle = 'rgba(9, 11, 20, 0.78)';
        const tagY = cat.y + (cat.giantTimer > 0 ? TILE * 0.92 : TILE * 0.56);
        ctx.fillRect(cat.x - 11, tagY - 6, 22, 12);
        ctx.fillStyle = cat.playerNumber === 1 ? '#FDBA74' : '#93C5FD';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${cat.playerNumber}`, cat.x, tagY + 0.5);
      }

      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      for (const ft of floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
        ctx.font = `bold ${Math.round(12 * ft.scale)}px "Silkscreen", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#090B14';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('whisker-input', handleVirtualInput);
      onRegisterQuestVRRef.current?.(null);
      if (fpTouchTimerRef.current !== null) {
        window.clearTimeout(fpTouchTimerRef.current);
        fpTouchTimerRef.current = null;
      }
      fpTouchForwardRef.current = false;
      if (questXR) {
        void questXR.end();
        questXR = null;
      }
    };
  }, [roundSessionKey, playerCount, maze, difficulty, roundNumber, totalRounds]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (playerCount !== 1 || viewMode === 'top_down') return;
    swipeOriginRef.current = { x: e.clientX, y: e.clientY, steered: false };
    if (fpTouchTimerRef.current !== null) {
      window.clearTimeout(fpTouchTimerRef.current);
    }
    // Press-and-hold moves forward in 1st-person / VR; swipe turns without unintended step
    fpTouchTimerRef.current = window.setTimeout(() => {
      fpTouchTimerRef.current = null;
      fpTouchForwardRef.current = true;
    }, 55);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const origin = swipeOriginRef.current;
    if (!origin || playerCount !== 1 || viewMode === 'top_down') return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 24) return;

    if (fpTouchTimerRef.current !== null) {
      window.clearTimeout(fpTouchTimerRef.current);
      fpTouchTimerRef.current = null;
    }

    const dir: Direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'RIGHT'
          : 'LEFT'
        : dy > 0
        ? 'DOWN'
        : 'UP';

    origin.x = e.clientX;
    origin.y = e.clientY;
    origin.steered = true;
    if (dir === 'UP') {
      fpTouchForwardRef.current = true;
    } else {
      fpTouchForwardRef.current = false;
    }
    window.dispatchEvent(
      new CustomEvent('whisker-input', { detail: { player: 1, dir } })
    );
  };

  const handleCanvasPointerUp = () => {
    if (fpTouchTimerRef.current !== null) {
      window.clearTimeout(fpTouchTimerRef.current);
      fpTouchTimerRef.current = null;
    }
    fpTouchForwardRef.current = false;
    swipeOriginRef.current = null;
  };

  if (fullBleedVR) {
    return (
      <div
        ref={containerRef}
        className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-[#05070E]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          style={
            fittedSize
              ? {
                  width: `${fittedSize.w}px`,
                  height: `${fittedSize.h}px`,
                }
              : {
                  width: '100%',
                  height: '100%',
                }
          }
          className="block h-full w-full touch-none select-none"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden"
    >
      <div className="relative flex items-center justify-center rounded-xl border-2 border-[#2B3554] bg-[#0B0E1A] p-1.5 shadow-2xl">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          style={
            fittedSize
              ? {
                  width: `${fittedSize.w}px`,
                  height: `${fittedSize.h}px`,
                }
              : {
                  maxHeight:
                    canvasMaxHeight ??
                    (mobileControlsEnabled
                      ? 'calc(100vh - 305px)'
                      : 'calc(100vh - 184px)'),
                  maxWidth: canvasMaxWidth ?? '100%',
                  aspectRatio: `${COLS} / ${ROWS}`,
                }
          }
          className="block rounded-lg touch-none select-none"
        />
        <div className="arcade-scanlines pointer-events-none absolute inset-1.5 rounded-lg" />
      </div>
    </div>
  );
};
