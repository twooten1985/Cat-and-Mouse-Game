import React, { useEffect, useRef, useState } from 'react';
import { Compass, Crosshair } from 'lucide-react';
import { Direction, MobilePadLayout, PlayerProfile } from '../types/game';

interface MobileControlsProps {
  playerCount: 1 | 2;
  profiles: [PlayerProfile, PlayerProfile];
  layout: MobilePadLayout;
  motionEnabled: boolean;
  motionStatus: string;
  onToggleLayout: () => void;
  onToggleMotion: () => void;
}

function sendDirection(player: 1 | 2, dir: Direction) {
  window.dispatchEvent(
    new CustomEvent('whisker-input', { detail: { player, dir } })
  );
}

function getRotationClass(deg: 0 | 90 | -90 | 180): string {
  switch (deg) {
    case 90:
      return 'rotate-90';
    case -90:
      return '-rotate-90';
    case 180:
      return 'rotate-180';
    default:
      return '';
  }
}

export const DigitalJoystick: React.FC<{
  playerNumber: 1 | 2;
  profile: PlayerProfile;
  size?: 'compact' | 'large';
  orientationDeg?: 0 | 90 | -90 | 180;
  motionEnabled?: boolean;
  recenterSignal?: number;
  hideHeader?: boolean;
}> = ({
  playerNumber,
  profile,
  size = 'compact',
  orientationDeg = 0,
  motionEnabled = false,
  recenterSignal = 0,
  hideHeader = false,
}) => {
  const activePointerIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number; radius: number } | null>(
    null
  );
  const baselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const lastDirRef = useRef<Direction>('NONE');
  const lastEmitTimeRef = useRef<number>(0);

  const [stick, setStick] = useState<{
    dx: number;
    dy: number;
    dir: Direction;
    isDragging: boolean;
    hasSensorData: boolean;
  }>({
    dx: 0,
    dy: 0,
    dir: 'NONE',
    isDragging: false,
    hasSensorData: false,
  });

  const recalibrate = () => {
    baselineRef.current = null;
    lastDirRef.current = 'NONE';
    setStick({
      dx: 0,
      dy: 0,
      dir: 'NONE',
      isDragging: false,
      hasSensorData: false,
    });
  };

  useEffect(() => {
    if (recenterSignal > 0) {
      recalibrate();
    }
  }, [recenterSignal]);

  // Optional Motion Tilt integration (active when motionEnabled && not dragging)
  useEffect(() => {
    if (!motionEnabled) {
      baselineRef.current = null;
      setStick((prev) => ({
        ...prev,
        dx: prev.isDragging ? prev.dx : 0,
        dy: prev.isDragging ? prev.dy : 0,
        dir: prev.isDragging ? prev.dir : 'NONE',
        hasSensorData: false,
      }));
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      if (activePointerIdRef.current !== null) return;

      if (!baselineRef.current) {
        baselineRef.current = { beta: event.beta, gamma: event.gamma };
      }

      const rawBeta = event.beta - baselineRef.current.beta;
      const rawGamma = event.gamma - baselineRef.current.gamma;

      const screenAngle =
        window.screen.orientation?.angle ??
        (window.innerWidth > window.innerHeight ? 90 : 0);

      let tiltX = rawGamma;
      let tiltY = rawBeta;
      if (screenAngle === 90) {
        tiltX = rawBeta;
        tiltY = -rawGamma;
      } else if (screenAngle === -90 || screenAngle === 270) {
        tiltX = -rawBeta;
        tiltY = rawGamma;
      }

      const clamp = (v: number) => Math.max(-35, Math.min(35, v));
      const clampedX = clamp(tiltX);
      const clampedY = clamp(tiltY);

      const threshold = 10;
      let dir: Direction = 'NONE';
      if (Math.abs(clampedX) >= threshold || Math.abs(clampedY) >= threshold) {
        if (Math.abs(clampedX) > Math.abs(clampedY)) {
          dir = clampedX > 0 ? 'RIGHT' : 'LEFT';
        } else {
          dir = clampedY > 0 ? 'DOWN' : 'UP';
        }
      }

      setStick({
        dx: clampedX / 35,
        dy: clampedY / 35,
        dir,
        isDragging: false,
        hasSensorData: true,
      });

      const now = performance.now();
      if (
        dir !== 'NONE' &&
        (dir !== lastDirRef.current || now - lastEmitTimeRef.current > 120)
      ) {
        lastDirRef.current = dir;
        lastEmitTimeRef.current = now;
        sendDirection(playerNumber, dir);
      } else if (dir === 'NONE' && lastDirRef.current !== 'NONE') {
        lastDirRef.current = 'NONE';
        sendDirection(playerNumber, 'NONE');
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener(
      'deviceorientationabsolute',
      handleOrientation as EventListener
    );
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener(
        'deviceorientationabsolute',
        handleOrientation as EventListener
      );
    };
  }, [motionEnabled, playerNumber]);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const center = centerRef.current;
    if (!center) return;
    const rawDx = (clientX - center.x) / center.radius;
    const rawDy = (clientY - center.y) / center.radius;
    const mag = Math.hypot(rawDx, rawDy);
    const dx = mag > 1 ? rawDx / mag : rawDx;
    const dy = mag > 1 ? rawDy / mag : rawDy;

    let dir: Direction = 'NONE';
    if (Math.abs(dx) >= 0.22 || Math.abs(dy) >= 0.22) {
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        dir = dy > 0 ? 'DOWN' : 'UP';
      }
    }

    setStick((prev) => ({
      ...prev,
      dx,
      dy,
      dir,
      isDragging: true,
    }));

    const now = performance.now();
    if (
      dir !== 'NONE' &&
      (dir !== lastDirRef.current || now - lastEmitTimeRef.current > 95)
    ) {
      lastDirRef.current = dir;
      lastEmitTimeRef.current = now;
      sendDirection(playerNumber, dir);
    } else if (dir === 'NONE' && lastDirRef.current !== 'NONE') {
      lastDirRef.current = 'NONE';
      sendDirection(playerNumber, 'NONE');
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: Math.max(24, rect.width / 2 - 12),
    };
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    if (lastDirRef.current !== 'NONE') {
      lastDirRef.current = 'NONE';
      sendDirection(playerNumber, 'NONE');
    }
    setStick((prev) => ({
      ...prev,
      dx: 0,
      dy: 0,
      dir: 'NONE',
      isDragging: false,
    }));
  };

  const rotClass = getRotationClass(orientationDeg);
  const wellSize = size === 'large' ? 'h-28 w-28' : 'h-24 w-24';
  const travelPx = size === 'large' ? 34 : 28;
  const knobSize = size === 'large' ? 'h-9 w-9' : 'h-8 w-8';

  return (
    <div className="flex flex-col items-center gap-1 select-none touch-none">
      {!hideHeader && (
        <div
          className={`font-arcade text-[10px] tracking-wider whitespace-nowrap ${rotClass}`}
          style={{ color: profile.skin.primaryColor }}
        >
          P{playerNumber} {profile.name}
        </div>
      )}

      <div
        role="slider"
        aria-label={`Player ${playerNumber} Digital Joystick`}
        aria-valuetext={stick.dir}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className={`relative ${wellSize} shrink-0 cursor-grab rounded-full border-2 bg-[#090B14] shadow-inner touch-none select-none active:cursor-grabbing`}
        style={{
          borderColor:
            stick.dir !== 'NONE' ? profile.skin.primaryColor : '#2B3554',
        }}
      >
        {/* Crosshair guides */}
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-px bg-[#1E263D]" />
        <div className="pointer-events-none absolute inset-y-3 left-1/2 w-px bg-[#1E263D]" />
        <div className="pointer-events-none absolute inset-4 rounded-full border border-dashed border-[#1E263D]" />

        {/* Cardinal direction indicators */}
        <span
          className={`pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[9px] font-bold ${
            stick.dir === 'UP' ? 'text-amber-300' : 'text-slate-600'
          }`}
        >
          ▲
        </span>
        <span
          className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold ${
            stick.dir === 'DOWN' ? 'text-amber-300' : 'text-slate-600'
          }`}
        >
          ▼
        </span>
        <span
          className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold ${
            stick.dir === 'LEFT' ? 'text-amber-300' : 'text-slate-600'
          }`}
        >
          ◀
        </span>
        <span
          className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold ${
            stick.dir === 'RIGHT' ? 'text-amber-300' : 'text-slate-600'
          }`}
        >
          ▶
        </span>

        {/* Draggable Joystick Puck */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 ${knobSize} -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-lg transition-transform duration-75 flex items-center justify-center`}
          style={{
            backgroundColor: profile.skin.primaryColor,
            transform: `translate(${stick.dx * travelPx}px, ${
              stick.dy * travelPx
            }px)`,
          }}
        >
          <span
            className={`font-arcade text-[9px] font-bold text-slate-950 ${rotClass}`}
          >
            P{playerNumber}
          </span>
        </div>
      </div>

      {motionEnabled && playerNumber === 1 && (
        <button
          type="button"
          onClick={recalibrate}
          className={`inline-flex items-center gap-1 rounded-md border border-[#2B3554] bg-[#161C2E] px-2 py-0.5 text-[10px] font-medium text-sky-300 hover:border-sky-400/60 whitespace-nowrap ${rotClass}`}
        >
          <Crosshair className="h-3 w-3" />
          Recenter
        </button>
      )}
    </div>
  );
};

export const MobileControls: React.FC<MobileControlsProps> = ({
  playerCount,
  profiles,
  layout,
  motionEnabled,
  motionStatus,
  onToggleLayout,
  onToggleMotion,
}) => {
  const showDual = playerCount === 2 && layout === 'dual';
  const [recenterSignal, setRecenterSignal] = useState(0);

  const layoutLabel =
    layout === 'dual'
      ? 'Dual Joysticks'
      : layout === 'single_p1'
      ? 'Large P1 Stick'
      : 'Opposite Ends';

  return (
    <div className="w-full max-w-[780px] shrink-0 rounded-xl border border-[#2B3554] bg-[#0D111E]/95 px-3 py-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          {motionEnabled
            ? motionStatus || 'Tilt phone or drag P1 joystick'
            : 'Drag joystick to steer'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMotion}
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
              motionEnabled
                ? 'border-sky-400/70 bg-sky-500/15 text-sky-300'
                : 'border-[#2B3554] bg-[#161C2E] text-slate-200 hover:border-sky-400/60'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            {motionEnabled ? 'Tilt: On' : 'Tilt: Off'}
          </button>

          {motionEnabled && (
            <button
              type="button"
              onClick={() => setRecenterSignal((s) => s + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-[#2B3554] bg-[#161C2E] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-amber-400/60 whitespace-nowrap"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Recenter
            </button>
          )}

          {playerCount === 2 && (
            <button
              type="button"
              onClick={onToggleLayout}
              className="rounded-md border border-[#2B3554] bg-[#161C2E] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-amber-400/60 whitespace-nowrap"
            >
              {layoutLabel}
            </button>
          )}
        </div>
      </div>

      {showDual ? (
        <div className="flex items-center justify-between gap-4 px-2 sm:px-6">
          <DigitalJoystick
            playerNumber={1}
            profile={profiles[0]}
            size="compact"
            motionEnabled={motionEnabled}
            recenterSignal={recenterSignal}
          />
          <DigitalJoystick
            playerNumber={2}
            profile={profiles[1]}
            size="compact"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <DigitalJoystick
            playerNumber={1}
            profile={profiles[0]}
            size="large"
            motionEnabled={motionEnabled}
            recenterSignal={recenterSignal}
          />
        </div>
      )}
    </div>
  );
};
