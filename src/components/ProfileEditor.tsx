import React, { useState } from 'react';
import {
  CAT_ACCESSORIES,
  CAT_COLOR_OPTIONS,
  CAT_PATTERNS,
} from '../data/catSkins';
import { CatAccessory, CatPattern, PlayerProfile } from '../types/game';
import { soundEngine } from '../utils/sound';
import { CatPreview } from './CatPreview';

interface ProfileEditorProps {
  profile: PlayerProfile;
  controlsHint: string;
  onChange: (updated: PlayerProfile) => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  controlsHint,
  onChange,
}) => {
  const [giantPreview, setGiantPreview] = useState(false);

  const updateName = (name: string) => {
    const clean = name.toUpperCase().slice(0, 10);
    onChange({ ...profile, name: clean });
  };

  const selectColor = (colorId: string) => {
    const found = CAT_COLOR_OPTIONS.find((c) => c.id === colorId);
    if (!found) return;
    soundEngine.playMenuClick();
    onChange({
      ...profile,
      skin: {
        ...profile.skin,
        colorId: found.id,
        primaryColor: found.primary,
        secondaryColor: found.secondary,
        earInnerColor: found.earInner,
      },
    });
  };

  const selectPattern = (pattern: CatPattern) => {
    soundEngine.playMenuClick();
    onChange({ ...profile, skin: { ...profile.skin, pattern } });
  };

  const selectAccessory = (accessory: CatAccessory) => {
    soundEngine.playMenuClick();
    onChange({ ...profile, skin: { ...profile.skin, accessory } });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#2B3554] bg-[#12172A] p-5">
      {/* Header Row with Live Cat Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-[#2B3554] bg-[#090B14]">
          <CatPreview
            skin={profile.skin}
            playerNumber={profile.playerNumber}
            size={74}
            giantPreview={giantPreview}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-arcade text-xs text-slate-400">
              Player {profile.playerNumber} Profile
            </span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Controls: {controlsHint}
            </span>
          </div>

          <input
            type="text"
            value={profile.name}
            onChange={(e) => updateName(e.target.value)}
            maxLength={10}
            aria-label={`Player ${profile.playerNumber} profile name`}
            placeholder={`PLAYER ${profile.playerNumber}`}
            className="font-arcade mt-1.5 w-full rounded-lg border border-[#2B3554] bg-[#090B14] px-3 py-1.5 text-sm text-white outline-none transition-colors focus:border-amber-400"
          />

          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400 tabular-nums">
            <span>
              {profile.stats.wins} Wins · Best{' '}
              {profile.stats.highScore.toLocaleString()} ·{' '}
              {profile.stats.miceSquashed} Squashed
            </span>
            <button
              type="button"
              onClick={() => {
                soundEngine.playMenuClick();
                setGiantPreview((v) => !v);
              }}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap ${
                giantPreview
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-[#090B14] text-slate-300 hover:text-white'
              }`}
            >
              {giantPreview ? 'Giant Preview' : 'Test Giant'}
            </button>
          </div>
        </div>
      </div>

      {/* Fur Color Swatches */}
      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-300">
          Cat Coat Color
        </div>
        <div className="grid grid-cols-8 gap-2">
          {CAT_COLOR_OPTIONS.map((c) => {
            const active = profile.skin.colorId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectColor(c.id)}
                title={c.label}
                aria-label={`Select ${c.label} fur color`}
                className={`h-8 w-full rounded-lg border-2 transition-transform hover:scale-105 ${
                  active
                    ? 'border-white ring-2 ring-amber-400/60'
                    : 'border-[#2B3554]'
                }`}
                style={{ backgroundColor: c.primary }}
              />
            );
          })}
        </div>
      </div>

      {/* Fur Pattern */}
      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-300">
          Fur Pattern
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {CAT_PATTERNS.map((p) => {
            const active = profile.skin.pattern === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPattern(p.id)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-[#090B14] text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accessory */}
      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-300">
          Arcade Gear
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {CAT_ACCESSORIES.map((a) => {
            const active = profile.skin.accessory === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => selectAccessory(a.id)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap truncate ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-[#090B14] text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
