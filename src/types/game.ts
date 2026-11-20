export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'ROUND_SUMMARY'
  | 'GAME_OVER';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

export type MobilePadLayout = 'dual' | 'single_p1' | 'opposite_ends';

export type SoloViewMode = 'top_down' | 'first_person' | 'vr_stereo';

export type CatPattern = 'solid' | 'tabby' | 'tuxedo' | 'calico' | 'siamese';

export type CatAccessory = 'none' | 'crown' | 'headband' | 'bowtie' | 'shades';

export interface CatSkin {
  colorId: string;
  primaryColor: string;
  secondaryColor: string;
  earInnerColor: string;
  pattern: CatPattern;
  accessory: CatAccessory;
}

export interface PlayerStats {
  wins: number;
  highScore: number;
  miceSquashed: number;
  wallsBroken: number;
}

export interface PlayerProfile {
  playerNumber: 1 | 2;
  name: string;
  skin: CatSkin;
  stats: PlayerStats;
}

export type DifficultyLevel = 'chill' | 'classic' | 'turbo';

export interface MatchSettings {
  playerCount: 1 | 2;
  mazeId: string;
  totalRounds: 1 | 3;
  difficulty: DifficultyLevel;
  randomizeEachRound: boolean;
  soloViewMode: SoloViewMode;
}

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  DESTRUCTIBLE = 2,
  MOUSE_NEST = 3,
  NEST_GATE = 4,
  PELLET = 5,
  GIANT_ORB = 6,
  SPEED_BOOST = 7,
  GHOST_ORB = 8,
  STICKY_PAWS = 9,
}

export interface MazeDefinition {
  id: string;
  name: string;
  themeColor: string;
  wallAccent: string;
  description: string;
  rows: string[];
  isGenerated?: boolean;
}

export interface HUDPlayerState {
  playerNumber: 1 | 2;
  score: number;
  roundScore: number;
  lives: number;
  multiplier: number;
  chaseHeat: number; // 0 to 100
  giantTimer: number; // seconds remaining (max 10)
  speedTimer: number; // seconds remaining (max 6)
  ghostTimer: number; // seconds remaining (max 7)
  stickyTimer: number; // seconds remaining when slowed by mouse Sticky Paws
  squashStreak: number;
  miceSquashedThisRound: number;
  wallsBrokenThisRound: number;
}

export interface HUDState {
  playerCount: 1 | 2;
  p1: HUDPlayerState;
  p2: HUDPlayerState;
  pelletsRemaining: number;
  pelletsTotal: number;
  roundNumber: number;
  totalRounds: number;
  p1RoundWins: number;
  p2RoundWins: number;
  roundTimeElapsed: number;
  roundWinner: 1 | 2 | 'DRAW' | 'SOLO_LOSS' | null;
  roundEndReason: string;
}
