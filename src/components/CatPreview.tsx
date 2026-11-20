import React, { useEffect, useRef } from 'react';
import { CatSkin } from '../types/game';
import { drawCatSprite } from '../utils/canvasSprites';

interface CatPreviewProps {
  skin: CatSkin;
  playerNumber: 1 | 2;
  size?: number;
  giantPreview?: boolean;
  ghostPreview?: boolean;
}

export const CatPreview: React.FC<CatPreviewProps> = ({
  skin,
  playerNumber,
  size = 76,
  giantPreview = false,
  ghostPreview = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const render = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const target = size * dpr;
      if (canvas.width !== target || canvas.height !== target) {
        canvas.width = target;
        canvas.height = target;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const t = (now - start) / 1000;
      drawCatSprite(ctx, {
        x: size / 2,
        y: size / 2 + 4,
        radius: giantPreview ? size * 0.19 : size * 0.28,
        skin,
        dir: 'DOWN',
        time: t,
        isGiant: giantPreview,
        giantTimer: 10,
        isSpeedBoost: false,
        isGhost: ghostPreview,
        ghostTimer: 7,
        invulnerableTimer: 0,
        stunTimer: 0,
        playerNumber,
      });

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [skin, playerNumber, size, giantPreview, ghostPreview]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block shrink-0"
      aria-label={`Player ${playerNumber} cat preview`}
    />
  );
};
