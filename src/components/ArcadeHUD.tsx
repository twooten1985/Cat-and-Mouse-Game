import React from 'react';
import {
  Crown,
  Compass,
  Droplets,
  Ghost,
  Glasses,
  Heart,
  Pause,
  Play,
  Smartphone,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  HUDPlayerState,
  HUDState,
  PlayerProfile,
  SoloViewMode,
} from '../types/game';
import { CatPreview } from './CatPreview';

interface ArcadeHUDProps {
  hud: HUDState;
  profiles: [PlayerProfile, PlayerProfile];
  mazeName: string;
  isPaused: boolean;
  isMuted: boolean;
  mobileControlsEnabled: boolean;
  motionEnabled: boolean;
  soloViewMode?: SoloViewMode;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleMobileControls: () => void;
  onToggleMotion: () => void;
  onCycleSoloViewMode?: () => void;
  onQuitToMenu: () => void;
}

export const PlayerHUDBlock: React.FC<{
  player: HUDPlayerState;
  profile: PlayerProfile;
  roundWins: number;
  align: 'left' | 'right';
  compact: boolean;
}> = ({ player, profile, roundWins, align, compact }) => {
  const isRight = align === 'right';
  const isGiant = player.giantTimer > 0;
  const isSpeed = player.speedTimer > 0;
  const isGhost = player.ghostTimer > 0;
  const isSticky = player.stickyTimer > 0;

  return (
    <div
      className={`flex flex-1 items-center gap-2.5 rounded-xl border border-[#2B3554] bg-[#12172A] ${
        compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'
      } ${isRight ? 'flex-row-reverse text-right' : ''}`}
    >
      {!compact && (
        <div className="relative hidden sm:flex h-13 w-13 shrink-0 items-center justify-center rounded-lg border border-[#2B3554] bg-[#090B14]">
          <CatPreview
            skin={profile.skin}
            playerNumber={profile.playerNumber}
            size={48}
            giantPreview={isGiant}
            ghostPreview={isGhost}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={`flex items-baseline gap-1.5 ${
            isRight ? 'flex-row-reverse' : ''
          }`}
        >
          <span
            className={`font-arcade truncate tracking-wide ${
              compact ? 'text-[11px]' : 'text-sm'
            }`}
            style={{ color: profile.skin.primaryColor }}
          >
            P{profile.playerNumber} {profile.name}
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums whitespace-nowrap">
            {roundWins}W
          </span>
        </div>

        <div
          className={`mt-0.5 flex items-center gap-2 ${
            isRight ? 'flex-row-reverse' : ''
          }`}
        >
          <span
            className={`font-mono font-bold text-slate-50 tabular-nums ${
              compact ? 'text-base' : 'text-xl'
            }`}
          >
            {player.score.toLocaleString()}
          </span>

          <div
            className="flex items-center gap-0.5"
            aria-label={`${player.lives} lives remaining`}
          >
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${
                  i < player.lives
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Chase Multiplier + Active Power-Up Timers */}
        <div
          className={`mt-1 flex flex-wrap items-center gap-2 ${
            isRight ? 'flex-row-reverse' : ''
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-[11px] font-bold tabular-nums ${
                player.multiplier >= 4
                  ? 'text-amber-300'
                  : player.multiplier >= 2
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {player.multiplier}x
            </span>
            <div className="h-1.5 w-12 sm:w-16 overflow-hidden rounded-full bg-[#090B14]">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${player.chaseHeat}%`,
                  backgroundColor:
                    player.multiplier >= 4
                      ? '#FDE047'
                      : player.multiplier >= 2
                      ? '#F59E0B'
                      : '#475569',
                }}
              />
            </div>
          </div>

          {isGiant && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-amber-300 tabular-nums whitespace-nowrap">
              <Crown className="h-3 w-3 text-amber-400" />
              {player.giantTimer.toFixed(1)}s
            </span>
          )}

          {isGhost && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-sky-300 tabular-nums whitespace-nowrap">
              <Ghost className="h-3 w-3 text-sky-400" />
              {player.ghostTimer.toFixed(1)}s
            </span>
          )}

          {isSpeed && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-300 tabular-nums whitespace-nowrap">
              <Zap className="h-3 w-3 text-emerald-400" />
              {player.speedTimer.toFixed(1)}s
            </span>
          )}

          {isSticky && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-fuchsia-300 tabular-nums whitespace-nowrap">
              <Droplets className="h-3 w-3 text-fuchsia-400" />
              SLOW {player.stickyTimer.toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ArcadeHUD: React.FC<ArcadeHUDProps> = ({
  hud,
  profiles,
  mazeName,
  isPaused,
  isMuted,
  mobileControlsEnabled,
  motionEnabled,
  soloViewMode = 'top_down',
  onTogglePause,
  onToggleMute,
  onToggleMobileControls,
  onToggleMotion,
  onCycleSoloViewMode,
  onQuitToMenu,
}) => {
  const viewLabel =
    soloViewMode === 'top_down'
      ? '2D'
      : soloViewMode === 'first_person'
      ? '1st Person'
      : 'VR';
  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-2">
      {/* Mobile / Phone Compact Top Controls Row */}
      <div className="flex md:hidden items-center justify-between gap-2 rounded-xl border border-[#2B3554] bg-[#12172A] px-3 py-1.5">
        <div className="min-w-0">
          <span className="font-arcade text-[11px] text-amber-400">
            R{hud.roundNumber}/{hud.totalRounds}
          </span>
          <span className="ml-2 text-xs text-slate-400 tabular-nums">
            {hud.pelletsRemaining} left
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMobileControls}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium whitespace-nowrap ${
              mobileControlsEnabled
                ? 'border-amber-400/70 bg-amber-500/15 text-amber-300'
                : 'border-[#2B3554] bg-[#090B14] text-slate-300'
            }`}
            aria-label="Toggle touch controls"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Pad
          </button>
          <button
            type="button"
            onClick={onToggleMotion}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium whitespace-nowrap ${
              motionEnabled
                ? 'border-sky-400/70 bg-sky-500/15 text-sky-300'
                : 'border-[#2B3554] bg-[#090B14] text-slate-300'
            }`}
            aria-label="Toggle motion tilt controls"
          >
            <Compass className="h-3.5 w-3.5" />
            Tilt
          </button>
          {hud.playerCount === 1 && onCycleSoloViewMode && (
            <button
              type="button"
              onClick={onCycleSoloViewMode}
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium whitespace-nowrap ${
                soloViewMode !== 'top_down'
                  ? 'border-violet-400/70 bg-violet-500/15 text-violet-300'
                  : 'border-[#2B3554] bg-[#090B14] text-slate-300'
              }`}
              aria-label="Cycle 1-player camera view"
            >
              <Glasses className="h-3.5 w-3.5" />
              {viewLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onTogglePause}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#2B3554] bg-[#090B14] px-2.5 text-xs font-medium text-slate-200 whitespace-nowrap"
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2B3554] bg-[#090B14]"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={onQuitToMenu}
            className="h-8 rounded-lg border border-[#2B3554] bg-[#090B14] px-2.5 text-xs font-medium text-slate-300 whitespace-nowrap"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Main 2-Player HUD Row */}
      <div className="flex w-full items-stretch gap-2 sm:gap-3">
        <PlayerHUDBlock
          player={hud.p1}
          profile={profiles[0]}
          roundWins={hud.p1RoundWins}
          align="left"
          compact={mobileControlsEnabled}
        />

        {/* Desktop Center Match Info & Controls */}
        <div className="hidden md:flex shrink-0 flex-col items-center justify-center rounded-xl border border-[#2B3554] bg-[#12172A] px-4 py-2 text-center">
          <div className="font-arcade text-xs text-amber-400 whitespace-nowrap">
            Round {hud.roundNumber} / {hud.totalRounds}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
            {mazeName} · {hud.pelletsRemaining} left
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePause}
              className="inline-flex items-center gap-1 rounded-lg border border-[#2B3554] bg-[#090B14] px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-300 whitespace-nowrap"
              aria-label={isPaused ? 'Resume game' : 'Pause game'}
            >
              {isPaused ? (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleMobileControls}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                mobileControlsEnabled
                  ? 'border-amber-400/70 bg-amber-500/15 text-amber-300'
                  : 'border-[#2B3554] bg-[#090B14] text-slate-300 hover:text-white'
              }`}
              title="Toggle Touch Joystick"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Touch
            </button>

            <button
              type="button"
              onClick={onToggleMotion}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                motionEnabled
                  ? 'border-sky-400/70 bg-sky-500/15 text-sky-300'
                  : 'border-[#2B3554] bg-[#090B14] text-slate-300 hover:text-white'
              }`}
              title="Toggle Motion Tilt Controls"
            >
              <Compass className="h-3.5 w-3.5" />
              Tilt
            </button>

            {hud.playerCount === 1 && onCycleSoloViewMode && (
              <button
                type="button"
                onClick={onCycleSoloViewMode}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  soloViewMode !== 'top_down'
                    ? 'border-violet-400/70 bg-violet-500/15 text-violet-300'
                    : 'border-[#2B3554] bg-[#090B14] text-slate-300 hover:text-white'
                }`}
                title="Switch 1P Camera: 2D Top-Down / 1st Person / VR Stereo"
              >
                <Glasses className="h-3.5 w-3.5" />
                {viewLabel}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center justify-center rounded-lg border border-[#2B3554] bg-[#090B14] p-1.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              title={isMuted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onQuitToMenu}
              className="rounded-lg border border-[#2B3554] bg-[#090B14] px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/60 hover:text-rose-300 whitespace-nowrap"
            >
              Menu
            </button>
          </div>
        </div>

        {hud.playerCount === 2 && (
          <PlayerHUDBlock
            player={hud.p2}
            profile={profiles[1]}
            roundWins={hud.p2RoundWins}
            align="right"
            compact={mobileControlsEnabled}
          />
        )}
      </div>
    </div>
  );
};

interface CompactMatchBarProps {
  hud: HUDState;
  isPaused: boolean;
  isMuted: boolean;
  motionEnabled: boolean;
  onCycleLayout: () => void;
  onToggleMotion: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onQuitToMenu: () => void;
}

export const CompactMatchBar: React.FC<CompactMatchBarProps> = ({
  hud,
  isPaused,
  isMuted,
  motionEnabled,
  onCycleLayout,
  onToggleMotion,
  onTogglePause,
  onToggleMute,
  onQuitToMenu,
}) => {
  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2B3554] bg-[#12172A] px-3 py-1.5">
      <div className="min-w-0">
        <span className="font-arcade text-[11px] text-amber-400">
          R{hud.roundNumber}/{hud.totalRounds}
        </span>
        <span className="ml-2 text-xs text-slate-400 tabular-nums">
          {hud.pelletsRemaining} left
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onCycleLayout}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-400/70 bg-amber-500/15 px-2.5 text-xs font-medium text-amber-300 whitespace-nowrap"
        >
          <Smartphone className="h-3.5 w-3.5" />
          Opposite Ends
        </button>

        <button
          type="button"
          onClick={onToggleMotion}
          className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium whitespace-nowrap ${
            motionEnabled
              ? 'border-sky-400/70 bg-sky-500/15 text-sky-300'
              : 'border-[#2B3554] bg-[#090B14] text-slate-300'
          }`}
          aria-label="Toggle motion tilt controls"
        >
          <Compass className="h-3.5 w-3.5" />
          Tilt
        </button>

        <button
          type="button"
          onClick={onTogglePause}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#2B3554] bg-[#090B14] px-2.5 text-xs font-medium text-slate-200 whitespace-nowrap"
          aria-label={isPaused ? 'Resume game' : 'Pause game'}
        >
          {isPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2B3554] bg-[#090B14]"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={onQuitToMenu}
          className="h-8 rounded-lg border border-[#2B3554] bg-[#090B14] px-2.5 text-xs font-medium text-slate-300 whitespace-nowrap"
        >
          Menu
        </button>
      </div>
    </div>
  );
};
