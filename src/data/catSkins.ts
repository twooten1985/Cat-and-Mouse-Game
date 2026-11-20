import { CatAccessory, CatPattern, PlayerProfile } from '../types/game';

export interface CatColorOption {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  earInner: string;
}

export const CAT_COLOR_OPTIONS: CatColorOption[] = [
  {
    id: 'tangerine',
    label: 'Tangerine',
    primary: '#F97316',
    secondary: '#C2410C',
    earInner: '#FDA4AF',
  },
  {
    id: 'cobalt',
    label: 'Cobalt',
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    earInner: '#F9A8D4',
  },
  {
    id: 'mint',
    label: 'Mint',
    primary: '#10B981',
    secondary: '#047857',
    earInner: '#FBCFE8',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    primary: '#EF4444',
    secondary: '#B91C1C',
    earInner: '#FECACA',
  },
  {
    id: 'cream',
    label: 'Cream',
    primary: '#FDE68A',
    secondary: '#D97706',
    earInner: '#FDA4AF',
  },
  {
    id: 'obsidian',
    label: 'Midnight',
    primary: '#475569',
    secondary: '#1E293B',
    earInner: '#F472B6',
  },
  {
    id: 'rose',
    label: 'Bubblegum',
    primary: '#EC4899',
    secondary: '#BE185D',
    earInner: '#FCE7F3',
  },
  {
    id: 'violet',
    label: 'Plum',
    primary: '#8B5CF6',
    secondary: '#6D28D9',
    earInner: '#FBCFE8',
  },
];

export const CAT_PATTERNS: { id: CatPattern; label: string }[] = [
  { id: 'tabby', label: 'Tabby' },
  { id: 'tuxedo', label: 'Tuxedo' },
  { id: 'calico', label: 'Calico' },
  { id: 'siamese', label: 'Siamese' },
  { id: 'solid', label: 'Solid' },
];

export const CAT_ACCESSORIES: { id: CatAccessory; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'headband', label: 'Ninja Band' },
  { id: 'crown', label: 'Crown' },
  { id: 'bowtie', label: 'Bowtie' },
  { id: 'shades', label: 'Shades' },
];

export const DEFAULT_PROFILES: [PlayerProfile, PlayerProfile] = [
  {
    playerNumber: 1,
    name: 'GINGER',
    skin: {
      colorId: 'tangerine',
      primaryColor: '#F97316',
      secondaryColor: '#C2410C',
      earInnerColor: '#FDA4AF',
      pattern: 'tabby',
      accessory: 'headband',
    },
    stats: { wins: 0, highScore: 0, miceSquashed: 0, wallsBroken: 0 },
  },
  {
    playerNumber: 2,
    name: 'AZURE',
    skin: {
      colorId: 'cobalt',
      primaryColor: '#3B82F6',
      secondaryColor: '#1D4ED8',
      earInnerColor: '#F9A8D4',
      pattern: 'tuxedo',
      accessory: 'shades',
    },
    stats: { wins: 0, highScore: 0, miceSquashed: 0, wallsBroken: 0 },
  },
];

const STORAGE_KEY = 'whisker_maze_profiles_v1';

export function loadProfiles(): [PlayerProfile, PlayerProfile] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILES);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 2) {
      return [
        { ...structuredClone(DEFAULT_PROFILES[0]), ...parsed[0], playerNumber: 1 },
        { ...structuredClone(DEFAULT_PROFILES[1]), ...parsed[1], playerNumber: 2 },
      ];
    }
  } catch {
    // Fallback cleanly to defaults
  }
  return structuredClone(DEFAULT_PROFILES);
}

export function saveProfiles(profiles: [PlayerProfile, PlayerProfile]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore storage quota errors
  }
}
