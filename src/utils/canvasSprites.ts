import { CatSkin, Direction } from '../types/game';

export interface CatRenderOptions {
  x: number;
  y: number;
  radius: number;
  skin: CatSkin;
  dir: Direction;
  time: number;
  isGiant: boolean;
  giantTimer: number;
  isSpeedBoost: boolean;
  isGhost?: boolean;
  ghostTimer?: number;
  isStickySlowed?: boolean;
  invulnerableTimer: number;
  stunTimer: number;
  playerNumber: 1 | 2;
}

export interface MouseRenderOptions {
  x: number;
  y: number;
  radius: number;
  furColor: string;
  earInnerColor: string;
  dir: Direction;
  time: number;
  isPanicked: boolean;
  isSquashed: boolean;
  isStickyPaws?: boolean;
}

function getDirAngle(dir: Direction): { dx: number; dy: number } {
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
      return { dx: 0, dy: 0.4 };
  }
}

export function drawCatSprite(
  ctx: CanvasRenderingContext2D,
  opts: CatRenderOptions
): void {
  const {
    x,
    y,
    radius,
    skin,
    dir,
    time,
    isGiant,
    giantTimer,
    isSpeedBoost,
    isGhost = false,
    ghostTimer = 0,
    isStickySlowed = false,
    invulnerableTimer,
    stunTimer,
    playerNumber,
  } = opts;

  ctx.save();

  // Ghost Mode spectral translucency & warning blink in last 2s
  const ghostWarningBlink =
    isGhost && ghostTimer <= 2.0 && Math.floor(time * 12) % 2 === 0;
  if (isGhost) {
    ctx.globalAlpha = ghostWarningBlink ? 0.85 : 0.56;
  } else if (invulnerableTimer > 0 && Math.floor(time * 16) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  // Giant scale: 1.82x with bouncy stomp
  const giantWarningBlink =
    isGiant && giantTimer <= 2.5 && Math.floor(time * 12) % 2 === 0;
  const stompBounce = isGiant ? Math.sin(time * 14) * 0.06 : 0;
  const ghostFloatY = isGhost ? Math.sin(time * 6) * 2.5 : 0;
  const scale = isGiant ? 1.82 + stompBounce : 1;
  const r = radius * scale;

  ctx.translate(x, y + ghostFloatY);

  // Sticky Paws slow goo ring
  if (isStickySlowed) {
    ctx.beginPath();
    ctx.arc(0, r * 0.35, r * 1.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(217, 70, 239, 0.24)';
    ctx.fill();
    ctx.strokeStyle = '#E879F9';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Ghost Spectral Aura Ring
  if (isGhost) {
    const gPulse = 1 + Math.sin(time * 8) * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.32 * gPulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = ghostWarningBlink ? '#F8FAFC' : '#38BDF8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = time * 24;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Giant Aura Ring
  if (isGiant) {
    const pulse = 1 + Math.sin(time * 10) * 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.28 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = giantWarningBlink
      ? 'rgba(239, 68, 68, 0.24)'
      : 'rgba(245, 158, 11, 0.24)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.strokeStyle = giantWarningBlink ? '#F87171' : '#FBBF24';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (isSpeedBoost && !isGhost) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -time * 40;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Stun wobble
  if (stunTimer > 0) {
    ctx.rotate(Math.sin(time * 28) * 0.2);
  }

  const { dx, dy } = getDirAngle(dir);

  // Animated swishing tail behind cat
  const tailWag = Math.sin(time * (isSpeedBoost ? 18 : 8)) * 0.45;
  const tailBaseX = -dx * r * 0.72;
  const tailBaseY = -dy * r * 0.72 + r * 0.25;
  ctx.beginPath();
  ctx.moveTo(tailBaseX * 0.6, tailBaseY * 0.6);
  ctx.quadraticCurveTo(
    tailBaseX * 1.4 + Math.cos(tailWag) * r * 0.45,
    tailBaseY - r * 0.35,
    tailBaseX * 1.35 + Math.sin(tailWag) * r * 0.55,
    tailBaseY - r * 0.75
  );
  ctx.strokeStyle =
    skin.pattern === 'siamese' ? '#3E2723' : skin.secondaryColor;
  ctx.lineWidth = Math.max(3, r * 0.22);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Pointed Cat Ears (drawn behind head circle)
  const drawEar = (side: -1 | 1) => {
    const tipX = side * r * 0.78;
    const tipY = -r * 1.08;
    const base1X = side * r * 0.16;
    const base1Y = -r * 0.78;
    const base2X = side * r * 0.88;
    const base2Y = -r * 0.25;

    ctx.beginPath();
    ctx.moveTo(base1X, base1Y);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(base2X, base2Y);
    ctx.closePath();
    ctx.fillStyle =
      skin.pattern === 'siamese' ? '#3E2723' : skin.primaryColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#090B14';
    ctx.stroke();

    // Inner pink ear
    ctx.beginPath();
    ctx.moveTo(side * r * 0.28, -r * 0.72);
    ctx.lineTo(side * r * 0.71, -r * 0.94);
    ctx.lineTo(side * r * 0.77, -r * 0.36);
    ctx.closePath();
    ctx.fillStyle = skin.earInnerColor;
    ctx.fill();
  };
  drawEar(-1);
  drawEar(1);

  // Main Cat Head / Body Circle
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = skin.primaryColor;
  ctx.fill();

  // Fur Patterns clipped to head
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.91, 0, Math.PI * 2);
  ctx.clip();

  if (skin.pattern === 'tabby') {
    ctx.fillStyle = skin.secondaryColor;
    // Forehead M-stripes
    ctx.fillRect(-r * 0.1, -r * 0.92, r * 0.2, r * 0.36);
    ctx.fillRect(-r * 0.36, -r * 0.88, r * 0.14, r * 0.3);
    ctx.fillRect(r * 0.22, -r * 0.88, r * 0.14, r * 0.3);
    // Cheek stripes
    ctx.fillRect(-r * 0.95, -r * 0.05, r * 0.32, r * 0.12);
    ctx.fillRect(r * 0.63, -r * 0.05, r * 0.32, r * 0.12);
    ctx.fillRect(-r * 0.95, r * 0.18, r * 0.26, r * 0.11);
    ctx.fillRect(r * 0.69, r * 0.18, r * 0.26, r * 0.11);
  } else if (skin.pattern === 'tuxedo') {
    ctx.fillStyle = '#F8FAFC';
    // White muzzle + bib
    ctx.beginPath();
    ctx.arc(0, r * 0.56, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, r * 0.25);
    ctx.lineTo(0, -r * 0.12);
    ctx.lineTo(r * 0.36, r * 0.25);
    ctx.closePath();
    ctx.fill();
  } else if (skin.pattern === 'calico') {
    // Cream base patch & dark spot
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(-r * 0.42, r * 0.34, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(r * 0.48, -r * 0.32, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
  } else if (skin.pattern === 'siamese') {
    // Dark chocolate mask center
    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.ellipse(dx * r * 0.1, r * 0.12, r * 0.56, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Crisp Dark Arcade Outline
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.strokeStyle = '#090B14';
  ctx.lineWidth = Math.max(1.8, r * 0.12);
  ctx.stroke();

  // Face offset slightly toward direction
  const fx = dx * r * 0.16;
  const fy = dy * r * 0.14;

  // Eyes
  const eyeY = fy - r * 0.14;
  const eyeSpacing = r * 0.34;
  const eyeRadius = isGiant ? r * 0.2 : r * 0.17;

  if (skin.accessory === 'shades' && !isGiant) {
    // Retro dark sunglasses
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.fillRect(fx - r * 0.62, eyeY - r * 0.16, r * 0.54, r * 0.3);
    ctx.strokeRect(fx - r * 0.62, eyeY - r * 0.16, r * 0.54, r * 0.3);
    ctx.fillRect(fx + r * 0.08, eyeY - r * 0.16, r * 0.54, r * 0.3);
    ctx.strokeRect(fx + r * 0.08, eyeY - r * 0.16, r * 0.54, r * 0.3);
    ctx.fillRect(fx - r * 0.08, eyeY - r * 0.07, r * 0.16, r * 0.08);
  } else {
    for (const side of [-1, 1]) {
      const ex = fx + side * eyeSpacing;
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isGiant ? '#FEF08A' : '#FFFFFF';
      ctx.fill();

      // Pupil
      ctx.beginPath();
      ctx.ellipse(
        ex + dx * eyeRadius * 0.28,
        eyeY + dy * eyeRadius * 0.28,
        isGiant ? eyeRadius * 0.32 : eyeRadius * 0.48,
        eyeRadius * 0.65,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#090B14';
      ctx.fill();

      // Eye shine
      ctx.beginPath();
      ctx.arc(ex - eyeRadius * 0.22, eyeY - eyeRadius * 0.26, eyeRadius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Fierce brows when Giant
      if (isGiant) {
        ctx.beginPath();
        ctx.moveTo(ex - side * eyeRadius * 0.9, eyeY - eyeRadius * 1.15);
        ctx.lineTo(ex + side * eyeRadius * 0.8, eyeY - eyeRadius * 0.55);
        ctx.strokeStyle = '#090B14';
        ctx.lineWidth = Math.max(2, r * 0.12);
        ctx.stroke();
      }
    }
  }

  // Pink Triangle Nose
  const noseY = fy + r * 0.14;
  ctx.beginPath();
  ctx.moveTo(fx - r * 0.12, noseY - r * 0.06);
  ctx.lineTo(fx + r * 0.12, noseY - r * 0.06);
  ctx.lineTo(fx, noseY + r * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#FB7185';
  ctx.fill();

  // Animated Chomp / Cat Mouth
  const chompOpen = Math.abs(Math.sin(time * 12)) * (isGiant ? 0.22 : 0.1);
  if (isGiant && chompOpen > 0.08) {
    ctx.beginPath();
    ctx.arc(fx, noseY + r * 0.22, r * chompOpen * 1.1, 0, Math.PI);
    ctx.fillStyle = '#7F1D1D';
    ctx.fill();
  } else {
    // Classic ':3' cat smile
    ctx.beginPath();
    ctx.arc(fx - r * 0.1, noseY + r * 0.16, r * 0.1, 0, Math.PI);
    ctx.arc(fx + r * 0.1, noseY + r * 0.16, r * 0.1, 0, Math.PI);
    ctx.strokeStyle = '#090B14';
    ctx.lineWidth = Math.max(1.4, r * 0.08);
    ctx.stroke();
  }

  // Whiskers (3 per side)
  ctx.strokeStyle =
    skin.pattern === 'siamese' ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.75)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (const side of [-1, 1]) {
    for (let w = -1; w <= 1; w++) {
      ctx.beginPath();
      ctx.moveTo(fx + side * r * 0.36, noseY + r * 0.05 + w * r * 0.09);
      ctx.lineTo(fx + side * r * 0.92, noseY + w * r * 0.18);
      ctx.stroke();
    }
  }

  // Accessories
  if (skin.accessory === 'headband') {
    ctx.fillStyle = playerNumber === 1 ? '#FACC15' : '#38BDF8';
    ctx.fillRect(-r * 0.82, -r * 0.56, r * 1.64, r * 0.22);
    ctx.strokeStyle = '#090B14';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-r * 0.82, -r * 0.56, r * 1.64, r * 0.22);
  } else if (skin.accessory === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.72);
    ctx.lineTo(-r * 0.48, -r * 1.2);
    ctx.lineTo(-r * 0.18, -r * 0.94);
    ctx.lineTo(0, -r * 1.3);
    ctx.lineTo(r * 0.18, -r * 0.94);
    ctx.lineTo(r * 0.48, -r * 1.2);
    ctx.lineTo(r * 0.42, -r * 0.72);
    ctx.closePath();
    ctx.fillStyle = '#FACC15';
    ctx.fill();
    ctx.strokeStyle = '#090B14';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else if (skin.accessory === 'bowtie') {
    const by = r * 0.72;
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, by - r * 0.16);
    ctx.lineTo(0, by);
    ctx.lineTo(-r * 0.34, by + r * 0.16);
    ctx.closePath();
    ctx.moveTo(r * 0.34, by - r * 0.16);
    ctx.lineTo(0, by);
    ctx.lineTo(r * 0.34, by + r * 0.16);
    ctx.closePath();
    ctx.fillStyle = playerNumber === 1 ? '#EF4444' : '#38BDF8';
    ctx.fill();
    ctx.strokeStyle = '#090B14';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Stunned spinning stars
  if (stunTimer > 0) {
    for (let i = 0; i < 3; i++) {
      const ang = time * 8 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * r * 0.85;
      const sy = -r * 0.9 + Math.sin(ang) * r * 0.22;
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawMouseSprite(
  ctx: CanvasRenderingContext2D,
  opts: MouseRenderOptions
): void {
  const {
    x,
    y,
    radius,
    furColor,
    earInnerColor,
    dir,
    time,
    isPanicked,
    isSquashed,
    isStickyPaws = false,
  } = opts;

  ctx.save();
  ctx.translate(x, y);

  // Sticky Paws aura around empowered mouse
  if (isStickyPaws && !isSquashed) {
    const pulse = 1 + Math.sin(time * 8) * 0.12;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.38 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(217, 70, 239, 0.22)';
    ctx.fill();
    ctx.strokeStyle = '#E879F9';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (isSquashed) {
    // Comic squashed flat pancake mouse!
    ctx.scale(1.35, 0.38);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#64748B';
    ctx.fill();
    ctx.strokeStyle = '#090B14';
    ctx.lineWidth = 2;
    ctx.stroke();

    // X eyes
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      const ex = s * radius * 0.35;
      ctx.beginPath();
      ctx.moveTo(ex - 4, -4);
      ctx.lineTo(ex + 4, 4);
      ctx.moveTo(ex + 4, -4);
      ctx.lineTo(ex - 4, 4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const { dx, dy } = getDirAngle(dir);
  const bodyColor = isPanicked ? '#818CF8' : furColor;
  const wiggle = isPanicked ? Math.sin(time * 28) * 1.6 : 0;
  ctx.translate(wiggle, 0);

  // Wiggly pink mouse tail
  const tailWave = Math.sin(time * 14) * radius * 0.38;
  const tx = -dx * radius * 0.7;
  const ty = -dy * radius * 0.7;
  ctx.beginPath();
  ctx.moveTo(tx * 0.6, ty * 0.6);
  ctx.quadraticCurveTo(
    tx * 1.3 + tailWave,
    ty * 1.3 - tailWave * 0.5,
    tx * 1.7 - tailWave * 0.6,
    ty * 1.7 + radius * 0.25
  );
  ctx.strokeStyle = '#F472B6';
  ctx.lineWidth = Math.max(2, radius * 0.18);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Big Round Mouse Ears
  for (const side of [-1, 1]) {
    const ex = side * radius * 0.56;
    const ey = -radius * 0.58;
    ctx.beginPath();
    ctx.arc(ex, ey, radius * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();
    ctx.strokeStyle = '#090B14';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ex, ey, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = isPanicked ? '#C7D2FE' : earInnerColor;
    ctx.fill();
  }

  // Mouse Body / Head
  ctx.beginPath();
  ctx.arc(0, radius * 0.06, radius * 0.78, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.strokeStyle = '#090B14';
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.stroke();

  // Snout
  const snoutX = dx * radius * 0.32;
  const snoutY = radius * 0.12 + dy * radius * 0.24;
  ctx.beginPath();
  ctx.ellipse(snoutX, snoutY, radius * 0.38, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = isPanicked ? '#A5B4FC' : bodyColor;
  ctx.fill();

  // Eyes
  const eyeY = -radius * 0.08 + dy * radius * 0.1;
  for (const side of [-1, 1]) {
    const ex = dx * radius * 0.15 + side * radius * 0.28;
    ctx.beginPath();
    ctx.arc(ex, eyeY, radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      ex + dx * radius * 0.05,
      eyeY + dy * radius * 0.05,
      isPanicked ? radius * 0.07 : radius * 0.09,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = isPanicked ? '#EF4444' : '#090B14';
    ctx.fill();
  }

  // Pink Mouse Nose
  ctx.beginPath();
  ctx.arc(snoutX + dx * radius * 0.2, snoutY + radius * 0.04, radius * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = '#FB7185';
  ctx.fill();

  // Mouse Whiskers
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
  ctx.lineWidth = 1.1;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(snoutX + side * radius * 0.18, snoutY);
    ctx.lineTo(snoutX + side * radius * 0.72, snoutY - radius * 0.14);
    ctx.moveTo(snoutX + side * radius * 0.18, snoutY + radius * 0.06);
    ctx.lineTo(snoutX + side * radius * 0.72, snoutY + radius * 0.14);
    ctx.stroke();
  }

  // Panic sweat drop when a Giant Cat is hunting!
  if (isPanicked) {
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(radius * 0.7, -radius * 0.72, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
