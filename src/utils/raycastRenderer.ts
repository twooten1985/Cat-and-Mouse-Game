import {
  Direction,
  MazeDefinition,
  PlayerProfile,
  SoloViewMode,
  TileType,
} from '../types/game';

export interface RaycastCatView {
  x: number;
  y: number;
  dir: Direction;
  facingDir: Direction;
  camAngle: number;
  giantTimer: number;
  speedTimer: number;
  ghostTimer: number;
  stickyTimer: number;
  invulnerableTimer: number;
  stunTimer: number;
  multiplier: number;
  score?: number;
  lives?: number;
}

export interface RaycastMouseView {
  id: number;
  x: number;
  y: number;
  furColor: string;
  earInnerColor: string;
  squashedTimer: number;
  stickyPawsTimer: number;
}

export interface RaycastPuddleView {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface RaycastSpeedPadView {
  row: number;
  col: number;
  respawnTimer: number;
}

export interface RaycastParticleView {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface RaycastFloatingTextView {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface RaycastRenderParams {
  ctx: CanvasRenderingContext2D;
  canvasW: number;
  canvasH: number;
  cols: number;
  rows: number;
  tileSize: number;
  grid: TileType[][];
  wallHp: number[][];
  maze: MazeDefinition;
  cat: RaycastCatView;
  profile: PlayerProfile;
  mice: RaycastMouseView[];
  puddles: RaycastPuddleView[];
  speedPads: RaycastSpeedPadView[];
  particles: RaycastParticleView[];
  floatingTexts: RaycastFloatingTextView[];
  timeSec: number;
  viewMode: SoloViewMode;
  headBob: number;
  headYawOffset?: number;
  pelletsRemaining?: number;
  bakeEyeHud?: boolean;
}

interface ProjectedSprite {
  x: number;
  y: number;
  dist: number;
  kind:
    | 'pellet'
    | 'giant_orb'
    | 'ghost_orb'
    | 'sticky_token'
    | 'speed_pad'
    | 'puddle'
    | 'mouse'
    | 'particle'
    | 'text';
  mouse?: RaycastMouseView;
  color?: string;
  text?: string;
  sizeFactor?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [71, 85, 105];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function shadeRgb(
  rgb: [number, number, number],
  brightness: number
): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] * brightness)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] * brightness)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] * brightness)));
  return `rgb(${r},${g},${b})`;
}

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const safeR = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, safeR);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function renderEyeViewport(
  params: RaycastRenderParams,
  vx: number,
  vy: number,
  vw: number,
  vh: number,
  eyeOffsetUnits: number,
  isVrEye: boolean
) {
  const {
    ctx,
    cols,
    rows,
    tileSize,
    grid,
    wallHp,
    maze,
    cat,
    profile,
    mice,
    puddles,
    speedPads,
    particles,
    floatingTexts,
    timeSec,
    headBob,
  } = params;

  if (vw < 4 || vh < 4) return;

  ctx.save();
  try {
    ctx.beginPath();
    if (isVrEye) {
      const radius = Math.min(vw, vh) * 0.14;
      drawRoundRectPath(ctx, vx + 3, vy + 3, vw - 6, vh - 6, radius);
    } else {
      ctx.rect(vx, vy, vw, vh);
    }
    ctx.clip();

    const effectiveAngle = cat.camAngle + (params.headYawOffset ?? 0);
    const dirX = Math.cos(effectiveAngle);
    const dirY = Math.sin(effectiveAngle);
    const perpX = -dirY;
    const perpY = dirX;

    // Camera position in grid tile units
    const camX = cat.x / tileSize + perpX * eyeOffsetUnits;
    const camY = cat.y / tileSize + perpY * eyeOffsetUnits;

    const isGiant = cat.giantTimer > 0;
    const isGhost = cat.ghostTimer > 0;
    const isSpeed = cat.speedTimer > 0;
    const isSticky = cat.stickyTimer > 0;

    const fov = isGiant ? 1.18 : isSpeed ? 1.16 : 1.05; // ~60-68 deg
    const halfFov = fov / 2;
    const scaleBase = isVrEye ? Math.max(vw, vh * 0.62) : vw;
    const projPlaneDist = vw / 2 / Math.tan(halfFov);
    const wallProjDist = scaleBase / 2 / Math.tan(halfFov);

    const horizonShift =
      headBob + (isGiant ? vh * 0.05 : 0) + (isSticky ? -vh * 0.03 : 0);
    const horizonY = Math.max(
      vy + 4,
      Math.min(vy + vh - 4, vy + vh * 0.5 + horizonShift)
    );

    // Ceiling gradient
    const ceilGrad = ctx.createLinearGradient(vx, vy, vx, horizonY);
    ceilGrad.addColorStop(0, '#050711');
    ceilGrad.addColorStop(1, isGhost ? '#0B2438' : '#10172E');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(vx, vy, vw, Math.max(1, horizonY - vy));

    // Floor gradient
    const floorGrad = ctx.createLinearGradient(vx, horizonY, vx, vy + vh);
    floorGrad.addColorStop(0, isGhost ? '#0C1E30' : '#0E1428');
    floorGrad.addColorStop(1, '#070912');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(vx, horizonY, vw, Math.max(1, vy + vh - horizonY));

    // Subtle horizon glow line
    ctx.fillStyle = isGiant
      ? 'rgba(245, 158, 11, 0.14)'
      : isGhost
      ? 'rgba(56, 189, 248, 0.16)'
      : 'rgba(99, 102, 241, 0.12)';
    ctx.fillRect(vx, horizonY - 2, vw, 4);

  const wallRgb = hexToRgb(maze.themeColor);
  const accentRgb = hexToRgb(maze.wallAccent);
  const brickRgb: [number, number, number] = [217, 119, 6];
  const gateRgb: [number, number, number] = [244, 114, 182];

  const colStep = 2;
  const numCols = Math.ceil(vw / colStep);
  const zBuffer = new Float32Array(numCols);

  // =========================================================================
  // 1. DDA WALL RAYCASTER
  // =========================================================================
  for (let i = 0; i < numCols; i++) {
    const screenOffset = (i + 0.5) * colStep - vw / 2;
    const rayAngleOffset = Math.atan2(screenOffset, projPlaneDist);
    const rayAngle = effectiveAngle + rayAngleOffset;
    const rayDirX = Math.cos(rayAngle);
    const rayDirY = Math.sin(rayAngle);

    let mapX = Math.floor(camX);
    let mapY = Math.floor(camY);

    const deltaDistX =
      Math.abs(rayDirX) < 1e-6 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY =
      Math.abs(rayDirY) < 1e-6 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX = 1;
    let sideDistX = 0;
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (camX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - camX) * deltaDistX;
    }

    let stepY = 1;
    let sideDistY = 0;
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (camY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - camY) * deltaDistY;
    }

    let hitTile: TileType = TileType.EMPTY;
    let hitHp = 2;
    let side = 0;
    let steps = 0;

    while (steps < 48) {
      steps++;
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      if (mapX < 0 || mapX >= cols || mapY < 0 || mapY >= rows) {
        hitTile = TileType.WALL;
        break;
      }

      const t = grid[mapY][mapX];
      if (
        t === TileType.WALL ||
        t === TileType.DESTRUCTIBLE ||
        t === TileType.NEST_GATE
      ) {
        hitTile = t;
        hitHp = wallHp[mapY]?.[mapX] ?? 2;
        break;
      }
    }

    const rawDist =
      side === 0
        ? sideDistX - deltaDistX
        : sideDistY - deltaDistY;
    // Correct fish-eye distortion
    const perpDist = Math.max(0.18, rawDist * Math.cos(rayAngleOffset));
    zBuffer[i] = perpDist;

    const wallHeight = (wallProjDist / perpDist) * 0.92;
    const drawTop = horizonY - wallHeight * (isGiant ? 0.44 : 0.5);

    // Texture coordinate along wall face [0, 1]
    let wallU =
      side === 0
        ? camY + rawDist * rayDirY
        : camX + rawDist * rayDirX;
    wallU -= Math.floor(wallU);

    const distFog = Math.max(0.18, 1 - perpDist / 14);
    const sideShade = side === 1 ? 0.76 : 1.0;
    const brightness = distFog * sideShade;

    const xPx = vx + i * colStep;

    if (hitTile === TileType.DESTRUCTIBLE) {
      ctx.fillStyle = shadeRgb(brickRgb, brightness);
      ctx.fillRect(xPx, drawTop, colStep, wallHeight);

      // Brick mortar bands
      ctx.fillStyle = `rgba(253, 230, 138, ${(0.35 * distFog).toFixed(2)})`;
      ctx.fillRect(xPx, drawTop + wallHeight * 0.33, colStep, 1.5);
      ctx.fillRect(xPx, drawTop + wallHeight * 0.66, colStep, 1.5);

      if (Math.abs(wallU - 0.5) < 0.04 || wallU < 0.04) {
        ctx.fillStyle = `rgba(24, 15, 6, ${(0.55 * distFog).toFixed(2)})`;
        ctx.fillRect(xPx, drawTop, colStep, wallHeight);
      }

      // Cracked overlay if damaged (hitHp === 1)
      if (hitHp <= 1 && Math.abs(wallU - 0.45) < 0.08) {
        ctx.fillStyle = `rgba(12, 10, 9, ${(0.85 * distFog).toFixed(2)})`;
        ctx.fillRect(xPx, drawTop + wallHeight * 0.15, colStep, wallHeight * 0.7);
      }
    } else if (hitTile === TileType.NEST_GATE) {
      // Translucent magenta energy gate
      ctx.fillStyle = shadeRgb(gateRgb, brightness * 0.5);
      ctx.fillRect(xPx, drawTop + wallHeight * 0.1, colStep, wallHeight * 0.8);
      if (Math.sin(wallU * Math.PI * 6 + timeSec * 4) > 0.2) {
        ctx.fillStyle = `rgba(244, 114, 182, ${(0.85 * distFog).toFixed(2)})`;
        ctx.fillRect(xPx, drawTop + wallHeight * 0.25, colStep, 3);
        ctx.fillRect(xPx, drawTop + wallHeight * 0.72, colStep, 3);
      }
    } else {
      // Standard arcade wall with neon top/bottom trim & tile seams
      ctx.fillStyle = shadeRgb(wallRgb, brightness);
      ctx.fillRect(xPx, drawTop, colStep, wallHeight);

      // Subtle vertical seam at tile boundaries
      if (wallU < 0.035 || wallU > 0.965) {
        ctx.fillStyle = `rgba(9, 11, 20, ${(0.5 * distFog).toFixed(2)})`;
        ctx.fillRect(xPx, drawTop, colStep, wallHeight);
      }

      // Top & bottom neon trim
      const trimH = Math.max(2, wallHeight * 0.055);
      ctx.fillStyle = shadeRgb(accentRgb, Math.min(1.15, brightness * 1.25));
      ctx.fillRect(xPx, drawTop, colStep, trimH);
      ctx.fillRect(xPx, drawTop + wallHeight - trimH, colStep, trimH);
    }
  }

  // =========================================================================
  // 2. COLLECT & SORT 3D SPRITES (Pellets, Orbs, Mice, Puddles, Particles)
  // =========================================================================
  const sprites: ProjectedSprite[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r][c];
      if (
        t !== TileType.PELLET &&
        t !== TileType.GIANT_ORB &&
        t !== TileType.GHOST_ORB &&
        t !== TileType.STICKY_PAWS
      ) {
        continue;
      }
      const sx = c + 0.5;
      const sy = r + 0.5;
      const dist = Math.hypot(sx - camX, sy - camY);
      if (dist > 13 || dist < 0.25) continue;
      sprites.push({
        x: sx,
        y: sy,
        dist,
        kind:
          t === TileType.PELLET
            ? 'pellet'
            : t === TileType.GIANT_ORB
            ? 'giant_orb'
            : t === TileType.GHOST_ORB
            ? 'ghost_orb'
            : 'sticky_token',
      });
    }
  }

  for (const pad of speedPads) {
    if (pad.respawnTimer > 0) continue;
    const sx = pad.col + 0.5;
    const sy = pad.row + 0.5;
    const dist = Math.hypot(sx - camX, sy - camY);
    if (dist > 13 || dist < 0.25) continue;
    sprites.push({ x: sx, y: sy, dist, kind: 'speed_pad' });
  }

  for (const puddle of puddles) {
    const sx = puddle.x / tileSize;
    const sy = puddle.y / tileSize;
    const dist = Math.hypot(sx - camX, sy - camY);
    if (dist > 12 || dist < 0.25) continue;
    sprites.push({
      x: sx,
      y: sy,
      dist,
      kind: 'puddle',
      sizeFactor: Math.min(1, puddle.life / 1.5),
    });
  }

  for (const m of mice) {
    const sx = m.x / tileSize;
    const sy = m.y / tileSize;
    const dist = Math.hypot(sx - camX, sy - camY);
    if (dist > 14 || dist < 0.22) continue;
    sprites.push({ x: sx, y: sy, dist, kind: 'mouse', mouse: m });
  }

  for (const p of particles) {
    const sx = p.x / tileSize;
    const sy = p.y / tileSize;
    const dist = Math.hypot(sx - camX, sy - camY);
    if (dist > 10 || dist < 0.2) continue;
    sprites.push({
      x: sx,
      y: sy,
      dist,
      kind: 'particle',
      color: p.color,
      sizeFactor: p.size,
    });
  }

  for (const ft of floatingTexts) {
    const sx = ft.x / tileSize;
    const sy = ft.y / tileSize;
    const dist = Math.hypot(sx - camX, sy - camY);
    if (dist > 10 || dist < 0.25) continue;
    sprites.push({
      x: sx,
      y: sy,
      dist,
      kind: 'text',
      text: ft.text,
      color: ft.color,
      sizeFactor: Math.min(1, (ft.life / ft.maxLife) * 1.4),
    });
  }

  // Sort far to near
  sprites.sort((a, b) => b.dist - a.dist);

  // =========================================================================
  // 3. PROJECT & DRAW SPRITES WITH Z-BUFFER WALL OCCLUSION
  // =========================================================================
  for (const sp of sprites) {
    const dx = sp.x - camX;
    const dy = sp.y - camY;
    const forward = dx * dirX + dy * dirY;
    if (forward <= 0.2) continue;
    const right = dx * perpX + dy * perpY;

    const screenX = vx + vw / 2 + (right / forward) * projPlaneDist;
    const spriteScale = wallProjDist / forward;

    // Check center column against zBuffer (with generous width sampling for large sprites)
    const centerCol = Math.floor((screenX - vx) / colStep);
    if (centerCol < -20 || centerCol >= numCols + 20) continue;

    const sampleCols =
      sp.kind === 'mouse'
        ? [centerCol - 3, centerCol, centerCol + 3]
        : [centerCol];
    let anyVisible = false;
    for (const sc of sampleCols) {
      if (sc >= 0 && sc < numCols && forward < zBuffer[sc] + 0.18) {
        anyVisible = true;
        break;
      }
    }
    if (!anyVisible) continue;

    // Only apply per-column clip on larger sprites (saves ~120 clip() calls/eye on mobile WebKit)
    let didSpriteClip = false;
    if (
      sp.kind === 'mouse' ||
      sp.kind === 'giant_orb' ||
      sp.kind === 'ghost_orb'
    ) {
      const halfSpanCols = Math.max(2, Math.ceil((spriteScale * 0.35) / colStep));
      let minVisCol = numCols;
      let maxVisCol = -1;
      for (
        let cIdx = Math.max(0, centerCol - halfSpanCols);
        cIdx <= Math.min(numCols - 1, centerCol + halfSpanCols);
        cIdx++
      ) {
        if (forward < zBuffer[cIdx] + 0.16) {
          if (cIdx < minVisCol) minVisCol = cIdx;
          if (cIdx > maxVisCol) maxVisCol = cIdx;
        }
      }
      if (maxVisCol < minVisCol) continue;
      const visLeft = vx + minVisCol * colStep;
      const visRight = vx + (maxVisCol + 1) * colStep;
      ctx.save();
      ctx.beginPath();
      ctx.rect(visLeft, vy, Math.max(1, visRight - visLeft), vh);
      ctx.clip();
      didSpriteClip = true;
    }

    const fogAlpha = Math.max(0.2, Math.min(1, 1.15 - forward / 13));
    ctx.globalAlpha = fogAlpha;

    if (sp.kind === 'pellet') {
      const r = Math.max(2, spriteScale * 0.085);
      const bob = Math.sin(timeSec * 4 + sp.x * 2) * r * 0.35;
      const py = horizonY + spriteScale * 0.15 + bob;
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(screenX, py, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.kind === 'giant_orb') {
      const r = Math.max(5, spriteScale * 0.22);
      const bob = Math.sin(timeSec * 5 + sp.x) * r * 0.25;
      const py = horizonY + spriteScale * 0.05 + bob;
      ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.beginPath();
      ctx.arc(screenX, py, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(screenX, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(screenX - r * 0.28, py - r * 0.28, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.kind === 'ghost_orb') {
      const r = Math.max(5, spriteScale * 0.21);
      const bob = Math.sin(timeSec * 4.5 + sp.y) * r * 0.3;
      const py = horizonY + spriteScale * 0.04 + bob;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.beginPath();
      ctx.arc(screenX, py, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(screenX, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(screenX - r * 0.24, py - r * 0.24, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.kind === 'sticky_token') {
      const r = Math.max(5, spriteScale * 0.2);
      const bob = Math.sin(timeSec * 4.2 + sp.x) * r * 0.25;
      const py = horizonY + spriteScale * 0.08 + bob;
      ctx.fillStyle = 'rgba(232, 121, 249, 0.26)';
      ctx.beginPath();
      ctx.arc(screenX, py, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E879F9';
      ctx.beginPath();
      ctx.arc(screenX, py, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.kind === 'speed_pad') {
      const w = Math.max(8, spriteScale * 0.42);
      const h = Math.max(4, spriteScale * 0.14);
      const py = horizonY + spriteScale * 0.38;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.32)';
      ctx.beginPath();
      ctx.ellipse(screenX, py, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#34D399';
      ctx.beginPath();
      ctx.ellipse(screenX, py, w * 0.55, h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.kind === 'puddle') {
      const s = sp.sizeFactor ?? 1;
      const w = Math.max(8, spriteScale * 0.48 * s);
      const h = Math.max(4, spriteScale * 0.14 * s);
      const py = horizonY + spriteScale * 0.42;
      ctx.fillStyle = 'rgba(217, 70, 239, 0.65)';
      ctx.beginPath();
      ctx.ellipse(screenX, py, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.kind === 'mouse' && sp.mouse) {
      const m = sp.mouse;
      const size = Math.max(10, spriteScale * 0.56);
      const isSquashed = m.squashedTimer > 0;
      const isPanicked = isGiant && !isSquashed;
      const isStickyMouse = m.stickyPawsTimer > 0 && !isSquashed;

      if (isSquashed) {
        const py = horizonY + spriteScale * 0.36;
        ctx.fillStyle = m.furColor;
        ctx.beginPath();
        ctx.ellipse(screenX, py, size * 0.55, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const hop = Math.abs(Math.sin(timeSec * 9 + m.id)) * size * 0.08;
        const bodyY = horizonY + spriteScale * 0.18 - hop;
        const r = size * 0.36;

        // Floor shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(
          screenX,
          horizonY + spriteScale * 0.42,
          r * 1.1,
          r * 0.28,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Sticky aura
        if (isStickyMouse) {
          ctx.fillStyle = 'rgba(232, 121, 249, 0.35)';
          ctx.beginPath();
          ctx.arc(screenX, bodyY, r * 1.45, 0, Math.PI * 2);
          ctx.fill();
        }

        const fur = isPanicked
          ? Math.floor(timeSec * 12) % 2 === 0
            ? '#60A5FA'
            : '#F8FAFC'
          : m.furColor;

        // Big mouse ears
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.arc(screenX - r * 0.72, bodyY - r * 0.72, r * 0.48, 0, Math.PI * 2);
        ctx.arc(screenX + r * 0.72, bodyY - r * 0.72, r * 0.48, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = m.earInnerColor;
        ctx.beginPath();
        ctx.arc(screenX - r * 0.72, bodyY - r * 0.72, r * 0.28, 0, Math.PI * 2);
        ctx.arc(screenX + r * 0.72, bodyY - r * 0.72, r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Mouse body/face
        ctx.fillStyle = fur;
        ctx.beginPath();
        ctx.arc(screenX, bodyY, r, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = isPanicked ? '#1E3A8A' : '#090B14';
        ctx.beginPath();
        ctx.arc(screenX - r * 0.32, bodyY - r * 0.12, r * 0.17, 0, Math.PI * 2);
        ctx.arc(screenX + r * 0.32, bodyY - r * 0.12, r * 0.17, 0, Math.PI * 2);
        ctx.fill();

        // Pink nose
        ctx.fillStyle = '#FB7185';
        ctx.beginPath();
        ctx.arc(screenX, bodyY + r * 0.24, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sp.kind === 'particle') {
      const pr = Math.max(2, (spriteScale * 0.06 * (sp.sizeFactor ?? 4)) / 4);
      ctx.fillStyle = sp.color ?? '#FBBF24';
      ctx.fillRect(screenX - pr / 2, horizonY - pr / 2, pr, pr);
    } else if (sp.kind === 'text' && sp.text) {
      ctx.globalAlpha = (sp.sizeFactor ?? 1) * fogAlpha;
      const fontSize = Math.max(10, Math.min(28, Math.round(spriteScale * 0.24)));
      ctx.font = `bold ${fontSize}px "Silkscreen", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#090B14';
      ctx.strokeText(sp.text, screenX, horizonY - spriteScale * 0.15);
      ctx.fillStyle = sp.color ?? '#FDE047';
      ctx.fillText(sp.text, screenX, horizonY - spriteScale * 0.15);
    }

    if (didSpriteClip) {
      ctx.restore();
    } else {
      ctx.globalAlpha = 1;
    }
  }

  // =========================================================================
  // 4. FIRST-PERSON CAT VISOR & POWER-UP EFFECTS
  // =========================================================================
  ctx.globalAlpha = 1;

  if (isGhost) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.11)';
    ctx.fillRect(vx, vy, vw, vh);
  } else if (isGiant) {
    const edgeGrad = ctx.createRadialGradient(
      vx + vw / 2,
      vy + vh / 2,
      Math.min(vw, vh) * 0.25,
      vx + vw / 2,
      vy + vh / 2,
      Math.max(vw, vh) * 0.62
    );
    edgeGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
    edgeGrad.addColorStop(1, 'rgba(245, 158, 11, 0.22)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(vx, vy, vw, vh);
  }

  if (isSticky) {
    ctx.fillStyle = 'rgba(232, 121, 249, 0.16)';
    ctx.fillRect(vx, vy + vh * 0.82, vw, vh * 0.18);
  }

  if (isSpeed) {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 6; s++) {
      const yLine = vy + ((s * 0.17 + (timeSec * 0.9) % 0.17) * vh);
      ctx.beginPath();
      ctx.moveTo(vx + 6, yLine);
      ctx.lineTo(vx + vw * 0.08, yLine);
      ctx.moveTo(vx + vw - 6, yLine);
      ctx.lineTo(vx + vw * 0.92, yLine);
      ctx.stroke();
    }
  }

  if (cat.invulnerableTimer > 0 && Math.floor(timeSec * 14) % 2 === 0) {
    ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
    ctx.fillRect(vx, vy, vw, vh);
  }

  // Subtle cat whiskers silhouette at lower corners
  const pawRise = isGiant ? 12 : 0;
  const pawBob = Math.sin(timeSec * 8) * 3;
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.24)';
  ctx.lineWidth = 1.5;
  for (let w = 0; w < 3; w++) {
    const wy = vy + vh - 22 - w * 10 - pawRise;
    ctx.beginPath();
    ctx.moveTo(vx + 8, wy);
    ctx.lineTo(vx + vw * 0.11, wy - 5 + w * 2);
    ctx.moveTo(vx + vw - 8, wy);
    ctx.lineTo(vx + vw * 0.89, wy - 5 + w * 2);
    ctx.stroke();
  }

  // Little cat paw silhouettes when Giant
  if (isGiant) {
    ctx.fillStyle = profile.skin.primaryColor;
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.ellipse(
      vx + vw * 0.18,
      vy + vh - 6 + pawBob,
      vw * 0.09,
      vh * 0.075,
      0,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      vx + vw * 0.82,
      vy + vh - 6 - pawBob,
      vw * 0.09,
      vh * 0.075,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Corner Minimap Radar
  const radarScale = Math.max(
    2.2,
    Math.min(isVrEye ? 4.2 : 6.2, (vw * 0.34) / cols)
  );
  const radarW = cols * radarScale;
  const radarH = rows * radarScale;
  const rx = vx + vw - radarW - (isVrEye ? 16 : 12);
  const ry = vy + (isVrEye ? 16 : 10);

  ctx.fillStyle = 'rgba(9, 11, 20, 0.78)';
  ctx.strokeStyle = 'rgba(43, 53, 84, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(rx - 3, ry - 3, radarW + 6, radarH + 6);
  ctx.strokeRect(rx - 3, ry - 3, radarW + 6, radarH + 6);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r][c];
      if (t === TileType.WALL) {
        ctx.fillStyle = maze.themeColor;
        ctx.fillRect(rx + c * radarScale, ry + r * radarScale, radarScale, radarScale);
      } else if (t === TileType.DESTRUCTIBLE) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(rx + c * radarScale, ry + r * radarScale, radarScale, radarScale);
      } else if (t === TileType.GIANT_ORB || t === TileType.GHOST_ORB) {
        ctx.fillStyle = t === TileType.GIANT_ORB ? '#FDE047' : '#38BDF8';
        ctx.fillRect(
          rx + (c + 0.25) * radarScale,
          ry + (r + 0.25) * radarScale,
          radarScale * 0.5,
          radarScale * 0.5
        );
      }
    }
  }

  // Mice dots on radar
  for (const m of mice) {
    if (m.squashedTimer > 0) continue;
    ctx.fillStyle = isGiant ? '#60A5FA' : '#FB7185';
    ctx.beginPath();
    ctx.arc(
      rx + (m.x / tileSize) * radarScale,
      ry + (m.y / tileSize) * radarScale,
      Math.max(2, radarScale * 0.42),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Player view cone + dot on radar
  const px = rx + (cat.x / tileSize) * radarScale;
  const py = ry + (cat.y / tileSize) * radarScale;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(
    px,
    py,
    radarScale * 2.8,
    effectiveAngle - 0.52,
    effectiveAngle + 0.52
  );
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = profile.skin.primaryColor;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(2.4, radarScale * 0.48), 0, Math.PI * 2);
  ctx.fill();

  // Optional baked-in HUD inside immersive WebXR headset eyes (since HTML DOM is hidden in XR)
  if (params.bakeEyeHud) {
    const padX = vx + (isVrEye ? 18 : 12);
    const padY = vy + (isVrEye ? 18 : 10);
    ctx.fillStyle = 'rgba(9, 11, 20, 0.72)';
    ctx.strokeStyle = 'rgba(43, 53, 84, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundRectPath(ctx, padX, padY, 186, 46, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = profile.skin.primaryColor;
    ctx.font = 'bold 11px "Silkscreen", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`SCORE ${(cat.score ?? 0).toLocaleString()}`, padX + 8, padY + 7);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    const hearts = '♥'.repeat(Math.max(0, cat.lives ?? 3));
    const leftTxt =
      params.pelletsRemaining !== undefined
        ? `${params.pelletsRemaining} left`
        : '';
    ctx.fillText(
      `${hearts}  ${cat.multiplier}x  ${leftTxt}`,
      padX + 8,
      padY + 25
    );
  }

  // VR Lens inner vignette border
  if (isVrEye) {
    const radius = Math.min(vw, vh) * 0.14;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundRectPath(ctx, vx + 3, vy + 3, vw - 6, vh - 6, radius);
    ctx.stroke();
  }
  } finally {
    ctx.restore();
  }
}

export function renderSingleVREyeCanvas(
  params: Omit<RaycastRenderParams, 'viewMode' | 'bakeEyeHud'>,
  eyeIndex: 0 | 1
) {
  const { ctx, canvasW, canvasH } = params;
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#05070E';
  ctx.fillRect(0, 0, canvasW, canvasH);
  renderEyeViewport(
    { ...params, viewMode: 'vr_stereo', bakeEyeHud: true },
    0,
    0,
    canvasW,
    canvasH,
    eyeIndex === 0 ? -0.07 : 0.07,
    false
  );
}

export function renderFirstPersonMazeView(params: RaycastRenderParams) {
  const { ctx, canvasW, canvasH, viewMode } = params;
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#05070E';
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (viewMode === 'vr_stereo') {
    const eyeW = Math.floor(canvasW / 2) - 4;
    // Left eye & Right eye stereoscopic parallax
    renderEyeViewport(params, 0, 0, eyeW, canvasH, -0.07, true);
    renderEyeViewport(params, eyeW + 8, 0, eyeW, canvasH, 0.07, true);

    // Center VR headset bridge marker
    ctx.fillStyle = '#020409';
    ctx.fillRect(eyeW, 0, 8, canvasH);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.fillRect(eyeW + 3, canvasH * 0.44, 2, canvasH * 0.12);
  } else {
    renderEyeViewport(params, 0, 0, canvasW, canvasH, 0, false);
  }
}
