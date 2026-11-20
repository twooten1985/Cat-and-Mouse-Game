import React from 'react';
import {
  DifficultyLevel,
  GameState,
  HUDState,
  MazeDefinition,
  PlayerProfile,
} from '../types/game';
import { CompactMatchBar, PlayerHUDBlock } from './ArcadeHUD';
import { GameCanvas } from './GameCanvas';
import { DigitalJoystick } from './MobileControls';

interface OppositeEndsArenaProps {
  isPortrait: boolean;
  roundSessionKey: number;
  gameState: GameState;
  maze: MazeDefinition;
  difficulty: DifficultyLevel;
  roundNumber: number;
  totalRounds: number;
  p1RoundWins: number;
  p2RoundWins: number;
  p1CumulativeScore: number;
  p2CumulativeScore: number;
  hud: HUDState;
  profiles: [PlayerProfile, PlayerProfile];
  isPaused: boolean;
  isMuted: boolean;
  motionEnabled: boolean;
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
  onToggleMute: () => void;
  onToggleMotion: () => void;
  onCycleLayout: () => void;
  onQuitToMenu: () => void;
}

export const OppositeEndsArena: React.FC<OppositeEndsArenaProps> = ({
  isPortrait,
  roundSessionKey,
  gameState,
  maze,
  difficulty,
  roundNumber,
  totalRounds,
  p1RoundWins,
  p2RoundWins,
  p1CumulativeScore,
  p2CumulativeScore,
  hud,
  profiles,
  isPaused,
  isMuted,
  motionEnabled,
  onHudUpdate,
  onRoundEnd,
  onTogglePause,
  onToggleMute,
  onToggleMotion,
  onCycleLayout,
  onQuitToMenu,
}) => {
  if (isPortrait) {
    return (
      <div className="flex h-full w-full min-h-0 flex-col items-center justify-between gap-1.5 overflow-hidden">
        {/* TOP END: Player 2 facing downward (180° rotated HUD & labels) */}
        <div className="flex w-full max-w-[780px] shrink-0 items-center justify-between gap-2.5 rounded-xl border border-[#2B3554] bg-[#0D111E]/95 px-2.5 py-2 overflow-hidden">
          <div className="min-w-0 flex-1 rotate-180">
            <PlayerHUDBlock
              player={hud.p2}
              profile={profiles[1]}
              roundWins={hud.p2RoundWins}
              align="left"
              compact
            />
          </div>
          <DigitalJoystick
            playerNumber={2}
            profile={profiles[1]}
            size="compact"
            orientationDeg={180}
          />
        </div>

        {/* SLIM MATCH UTILITY STRIP */}
        <div className="w-full shrink-0">
          <CompactMatchBar
            hud={hud}
            isPaused={isPaused}
            isMuted={isMuted}
            motionEnabled={motionEnabled}
            onCycleLayout={onCycleLayout}
            onToggleMotion={onToggleMotion}
            onTogglePause={onTogglePause}
            onToggleMute={onToggleMute}
            onQuitToMenu={onQuitToMenu}
          />
        </div>

        {/* CENTER MAZE (bounded tightly inside flex-1 slot) */}
        <div className="flex w-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
          <GameCanvas
            roundSessionKey={roundSessionKey}
            playerCount={2}
            gameState={gameState}
            maze={maze}
            difficulty={difficulty}
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            p1RoundWins={p1RoundWins}
            p2RoundWins={p2RoundWins}
            p1CumulativeScore={p1CumulativeScore}
            p2CumulativeScore={p2CumulativeScore}
            profiles={profiles}
            mobileControlsEnabled
            onHudUpdate={onHudUpdate}
            onRoundEnd={onRoundEnd}
            onTogglePause={onTogglePause}
          />
        </div>

        {/* BOTTOM END: Player 1 facing upward (normal 0°) */}
        <div className="flex w-full max-w-[780px] shrink-0 items-center justify-between gap-2.5 rounded-xl border border-[#2B3554] bg-[#0D111E]/95 px-2.5 py-2 overflow-hidden">
          <div className="min-w-0 flex-1">
            <PlayerHUDBlock
              player={hud.p1}
              profile={profiles[0]}
              roundWins={hud.p1RoundWins}
              align="left"
              compact
            />
          </div>
          <DigitalJoystick
            playerNumber={1}
            profile={profiles[0]}
            size="compact"
            motionEnabled={motionEnabled}
          />
        </div>
      </div>
    );
  }

  // LANDSCAPE OPPOSITE ENDS (Left End = P1 rotated +90°, Right End = P2 rotated -90°)
  return (
    <div className="flex h-full w-full min-h-0 flex-col items-center justify-between gap-2 overflow-hidden">
      <div className="w-full shrink-0">
        <CompactMatchBar
          hud={hud}
          isPaused={isPaused}
          isMuted={isMuted}
          motionEnabled={motionEnabled}
          onCycleLayout={onCycleLayout}
          onToggleMotion={onToggleMotion}
          onTogglePause={onTogglePause}
          onToggleMute={onToggleMute}
          onQuitToMenu={onQuitToMenu}
        />
      </div>

      <div className="flex min-h-0 min-w-0 w-full flex-1 items-stretch justify-between gap-2 overflow-hidden">
        {/* LEFT END: Player 1 Station (+90° rotated for left-edge player) */}
        <div className="flex h-full w-[134px] sm:w-[152px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-xl border border-[#2B3554] bg-[#0D111E]/95 p-2 overflow-hidden">
          <div className="flex h-[156px] w-[76px] shrink-0 items-center justify-center overflow-hidden">
            <div className="w-[156px] shrink-0 rotate-90">
              <PlayerHUDBlock
                player={hud.p1}
                profile={profiles[0]}
                roundWins={hud.p1RoundWins}
                align="left"
                compact
              />
            </div>
          </div>

          <DigitalJoystick
            playerNumber={1}
            profile={profiles[0]}
            size="compact"
            orientationDeg={90}
            motionEnabled={motionEnabled}
          />
        </div>

        {/* CENTER MAZE (bounded tightly between left & right stations) */}
        <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
          <GameCanvas
            roundSessionKey={roundSessionKey}
            playerCount={2}
            gameState={gameState}
            maze={maze}
            difficulty={difficulty}
            roundNumber={roundNumber}
            totalRounds={totalRounds}
            p1RoundWins={p1RoundWins}
            p2RoundWins={p2RoundWins}
            p1CumulativeScore={p1CumulativeScore}
            p2CumulativeScore={p2CumulativeScore}
            profiles={profiles}
            mobileControlsEnabled
            onHudUpdate={onHudUpdate}
            onRoundEnd={onRoundEnd}
            onTogglePause={onTogglePause}
          />
        </div>

        {/* RIGHT END: Player 2 Station (-90° rotated for right-edge player) */}
        <div className="flex h-full w-[134px] sm:w-[152px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-xl border border-[#2B3554] bg-[#0D111E]/95 p-2 overflow-hidden">
          <div className="flex h-[156px] w-[76px] shrink-0 items-center justify-center overflow-hidden">
            <div className="w-[156px] shrink-0 -rotate-90">
              <PlayerHUDBlock
                player={hud.p2}
                profile={profiles[1]}
                roundWins={hud.p2RoundWins}
                align="left"
                compact
              />
            </div>
          </div>

          <DigitalJoystick
            playerNumber={2}
            profile={profiles[1]}
            size="compact"
            orientationDeg={-90}
          />
        </div>
      </div>
    </div>
  );
};
