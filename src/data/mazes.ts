import { MazeDefinition } from '../types/game';

/**
 * All mazes are 23 columns wide by 17 rows tall and horizontally symmetrical
 * so Player 1 (left) and Player 2 (right) have fair competitive spawns.
 *
 * Legend:
 *  '#' = Solid wall
 *  'D' = Destructible brick/crate wall (2 hits normal, 1 hit Giant or Speed Boost)
 *  '.' = Kibble pellet
 *  'O' = Giant Catnip Orb (10 seconds Giant Cat mode — squash mice!)
 *  'S' = Speed Boost (Catnip Zoomies!)
 *  'M' = Mouse Nest interior
 *  '-' = Mouse Nest gate
 *  '1' = Player 1 start
 *  '2' = Player 2 start
 *  ' ' = Empty corridor / wrap tunnel
 */
export const MAZES: MazeDefinition[] = [
  {
    id: 'alleyway',
    name: 'Alleyway Showdown',
    themeColor: '#2563EB',
    wallAccent: '#60A5FA',
    description:
      'Symmetrical street grid with breakable alley crates, side warp tunnels, and contested giant orbs.',
    rows: [
      '#######################',
      '#O...D.....#.....D...O#',
      '#.##.#.###.#.###.#.##.#',
      '#....D.....S.....D....#',
      '###.##.#.#####.#.##.###',
      '#......#...#...#......#',
      '#.##.D.###---###.D.##.#',
      ' .....D..#MMM#..D..... ',
      '#.##.#.###MMM###.#.##.#',
      '#..S.#...........#.S..#',
      '#.##.#.##.###.##.#.##.#',
      '#......D...O...D......#',
      '###.##.#.#####.#.##.###',
      '#1...#.....#.....#...2#',
      '#.##.#.###.#.###.#.##.#',
      '#O...D...........D...O#',
      '#######################',
    ],
  },
  {
    id: 'cheese_factory',
    name: 'Cheese Factory',
    themeColor: '#D97706',
    wallAccent: '#FBBF24',
    description:
      'Open factory floor with destructible crate vaults guarding power-ups and dual warp lanes.',
    rows: [
      '#######################',
      '#O..#..D.......D..#..O#',
      '#.#.#.###.###.###.#.#.#',
      '#...D....S...S....D...#',
      ' .###.##.#.#.#.##.###. ',
      '#.#...#..#...#..#...#.#',
      '#.#.D.####---####.D.#.#',
      '#...#....#MMM#....#...#',
      '###.#.##.#MMM#.##.#.###',
      '#.....D.........D.....#',
      '#.##.##.##.#.##.##.##.#',
      '#S..D......O......D..S#',
      ' .###.#.#######.#.###. ',
      '#1....#....#....#....2#',
      '#.##.###.#.#.#.###.##.#',
      '#O.......D...D.......O#',
      '#######################',
    ],
  },
  {
    id: 'catacomb_sprint',
    name: 'Catacomb Sprint',
    themeColor: '#0D9488',
    wallAccent: '#2DD4BF',
    description:
      'High-speed tactical corridors loaded with breakable ambush walls for intense mouse chases.',
    rows: [
      '#######################',
      '#O...#.....S.....#...O#',
      '#.##.D.###.#.###.D.##.#',
      '#....#.....#.....#....#',
      '#.##.#.##D###D##.#.##.#',
      '#..D...............D..#',
      '###.##.###---###.##.###',
      ' .....#..#MMM#..#..... ',
      '#.##.D.###MMM###.D.##.#',
      '#..S...............S..#',
      '#.##.#.##D###D##.#.##.#',
      '#....D.....O.....D....#',
      '#.##.#.###.#.###.#.##.#',
      '#1...#.....#.....#...2#',
      '###.D.##.#####.##.D.###',
      '#O.........S.........O#',
      '#######################',
    ],
  },
  {
    id: 'twin_fortress',
    name: 'Twin Fortress',
    themeColor: '#7C3AED',
    wallAccent: '#A78BFA',
    description:
      'Mirrored bastion bunkers bridged by destructible siege walls and four-way center speed pads.',
    rows: [
      '#######################',
      '#O....D....#....D....O#',
      '#.###.#.##.#.##.#.###.#',
      '#.#S..#....D....#..S#.#',
      '#.#.##.###.#.###.##.#.#',
      '#...D.............D...#',
      '###.#.###-----###.#.###',
      ' .....#..#MMM#..#..... ',
      '###.#.###.MMM.###.#.###',
      '#..S..D.........D..S..#',
      '#.##.##.#.###.#.##.##.#',
      '#.......#..O..#.......#',
      '#.##.###D#####D###.##.#',
      '#1...#.....#.....#...2#',
      '#.####.###.#.###.####.#',
      '#O.....D.......D.....O#',
      '#######################',
    ],
  },
  {
    id: 'neon_labyrinth',
    name: 'Neon Labyrinth',
    themeColor: '#DB2777',
    wallAccent: '#F472B6',
    description:
      'Triple warp-tunnel ring with destructible vault chambers guarding high-speed flanking lanes.',
    rows: [
      '#######################',
      '#O..D......#......D..O#',
      '#.#.##.###.#.###.##.#.#',
      ' ...#..S.......S..#... ',
      '###.#.##.##.##.##.#.###',
      '#...D....#...#....D...#',
      '#.##.###.#---#.###.##.#',
      '#........#MMM#........#',
      '#.##.###.#MMM#.###.##.#',
      ' ...D.............D... ',
      '#.##.#.###.#.###.#.##.#',
      '#..S.#.....O.....#.S..#',
      '###.##.##.###.##.##.###',
      '#1.....D...#...D.....2#',
      '#.##.####.###.####.##.#',
      '#O........S..........O#',
      '#######################',
    ],
  },
];

const GENERATED_PALETTES = [
  { theme: '#0284C7', accent: '#38BDF8', label: 'Sky Grid' },
  { theme: '#059669', accent: '#34D399', label: 'Emerald Circuit' },
  { theme: '#E11D48', accent: '#FB7185', label: 'Ruby Vault' },
  { theme: '#D97706', accent: '#FBBF24', label: 'Amber Sector' },
  { theme: '#4F46E5', accent: '#818CF8', label: 'Cobalt Matrix' },
];

/**
 * Procedurally generates a balanced, horizontally symmetrical 23x17 maze
 * with guaranteed full BFS connectivity, central mouse nest, warp tunnels,
 * strategic destructible wall sections, and mirrored power-up placements.
 */
export function generateBalancedMaze(seedNumber?: number): MazeDefinition {
  const ROWS = 17;
  const COLS = 23;
  const MID = 11;

  for (let attempt = 0; attempt < 25; attempt++) {
    const grid: string[][] = Array.from({ length: ROWS }, () =>
      Array(COLS).fill('#')
    );

    // Carve symmetrical corridor grid with seeded/random variation
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c <= MID; c++) {
        const isBorderWalk = r === 1 || r === ROWS - 2 || c === 1;
        const isRingLane = r === 5 || r === 9 || r === 13 || c === 5 || c === 9;
        let open = false;

        if (isBorderWalk || isRingLane) {
          open = true;
        } else if (r % 2 === 1 && c % 2 === 1) {
          open = true;
        } else if (Math.random() < 0.44) {
          open = true;
        }

        if (open) {
          grid[r][c] = '.';
          grid[r][COLS - 1 - c] = '.';
        }
      }
    }

    // Carve 1 or 2 mirrored horizontal warp tunnels on left/right edges
    const tunnelRows = Math.random() < 0.5 ? [7] : [4, 11];
    for (const tr of tunnelRows) {
      grid[tr][0] = ' ';
      grid[tr][1] = '.';
      grid[tr][2] = '.';
      grid[tr][COLS - 1] = ' ';
      grid[tr][COLS - 2] = '.';
      grid[tr][COLS - 3] = '.';
    }

    // Stamp central Mouse Nest (rows 6..8, cols 9..13) and guaranteed perimeter loop
    for (let r = 5; r <= 9; r++) {
      for (let c = 8; c <= 14; c++) {
        grid[r][c] = '.';
      }
    }
    grid[6][9] = '#';
    grid[6][10] = '-';
    grid[6][11] = '-';
    grid[6][12] = '-';
    grid[6][13] = '#';
    grid[7][9] = '#';
    grid[7][10] = 'M';
    grid[7][11] = 'M';
    grid[7][12] = 'M';
    grid[7][13] = '#';
    grid[8][9] = '#';
    grid[8][10] = '#';
    grid[8][11] = '#';
    grid[8][12] = '#';
    grid[8][13] = '#';

    // Ensure P1 & P2 spawns are clear and mirrored at row 13, cols 1 & 21
    grid[13][1] = '1';
    grid[13][2] = '.';
    grid[13][COLS - 2] = '2';
    grid[13][COLS - 3] = '.';

    // Convert any 1-tile isolated unreachable pockets via BFS from P1 spawn (13, 1)
    const visited = Array.from({ length: ROWS }, () =>
      Array(COLS).fill(false)
    );
    const queue: [number, number][] = [[13, 1]];
    visited[13][1] = true;

    const isWalkable = (ch: string) =>
      ch === '.' || ch === ' ' || ch === '1' || ch === '2' || ch === 'O' || ch === 'S';

    while (queue.length > 0) {
      const [cr, cc] = queue.shift()!;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = cr + dr;
        const nc = ((cc + dc) % COLS + COLS) % COLS;
        if (nr >= 1 && nr < ROWS - 1 && !visited[nr][nc] && isWalkable(grid[nr][nc])) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    // Seal any disconnected pockets cleanly as walls so no pellet is trapped
    let pelletCount = 0;
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (isWalkable(grid[r][c]) && !visited[r][c]) {
          grid[r][c] = '#';
        }
        if (grid[r][c] === '.') pelletCount++;
      }
    }

    if (pelletCount < 70) continue;

    // Place mirrored Destructible Wall ('D') sections on interior bridge corridors
    const destructibleCandidates: [number, number][] = [];
    for (let r = 2; r < ROWS - 2; r++) {
      for (let c = 2; c < MID; c++) {
        if (r >= 5 && r <= 9 && c >= 8) continue; // protect nest area
        if (r === 13 && c <= 3) continue; // protect spawn
        if (grid[r][c] === '.') {
          const horizCorridor =
            grid[r][c - 1] === '.' &&
            grid[r][c + 1] === '.' &&
            grid[r - 1][c] === '#' &&
            grid[r + 1][c] === '#';
          const vertCorridor =
            grid[r - 1][c] === '.' &&
            grid[r + 1][c] === '.' &&
            grid[r][c - 1] === '#' &&
            grid[r][c + 1] === '#';
          if (horizCorridor || vertCorridor) {
            destructibleCandidates.push([r, c]);
          }
        }
      }
    }

    // Shuffle and pick up to 5 mirrored pairs (10 destructible walls)
    for (let i = destructibleCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [destructibleCandidates[i], destructibleCandidates[j]] = [
        destructibleCandidates[j],
        destructibleCandidates[i],
      ];
    }
    const maxPairs = Math.min(5, destructibleCandidates.length);
    for (let i = 0; i < maxPairs; i++) {
      const [dr, dc] = destructibleCandidates[i];
      grid[dr][dc] = 'D';
      grid[dr][COLS - 1 - dc] = 'D';
    }

    // Place 4 Giant Orbs ('O') symmetrically in corners
    grid[1][1] = 'O';
    grid[1][COLS - 2] = 'O';
    grid[ROWS - 2][1] = 'O';
    grid[ROWS - 2][COLS - 2] = 'O';

    // Place 4 strategic Speed Boosts ('S') symmetrically mid-arena
    const speedSpots: [number, number][] = [
      [3, 7],
      [9, 3],
      [11, 7],
      [5, 3],
    ];
    let placedSpeedPairs = 0;
    for (const [sr, sc] of speedSpots) {
      if (placedSpeedPairs >= 2) break;
      if (grid[sr][sc] === '.') {
        grid[sr][sc] = 'S';
        grid[sr][COLS - 1 - sc] = 'S';
        placedSpeedPairs++;
      }
    }

    const palette =
      GENERATED_PALETTES[Math.floor(Math.random() * GENERATED_PALETTES.length)];
    const tag = seedNumber ?? Math.floor(100 + Math.random() * 900);

    return {
      id: `generated_${tag}_${Date.now()}`,
      name: `${palette.label} #${tag}`,
      themeColor: palette.theme,
      wallAccent: palette.accent,
      description:
        'Procedurally generated symmetrical arena with balanced spawns, destructible shortcuts, and speed boosts.',
      rows: grid.map((r) => r.join('')),
      isGenerated: true,
    };
  }

  // Fallback to Neon Labyrinth if random attempt skipped
  return {
    ...MAZES[4],
    id: `generated_fallback_${Date.now()}`,
    isGenerated: true,
  };
}
