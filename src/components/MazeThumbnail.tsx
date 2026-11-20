import React from 'react';
import { MazeDefinition } from '../types/game';

interface MazeThumbnailProps {
  maze: MazeDefinition;
}

export const MazeThumbnail: React.FC<MazeThumbnailProps> = ({ maze }) => {
  const rows = maze.rows.length;
  const cols = maze.rows[0]?.length || 23;

  return (
    <svg
      viewBox={`0 0 ${cols * 4} ${rows * 4}`}
      className="h-24 w-full rounded-md bg-[#090B14] p-1"
      aria-hidden="true"
    >
      {maze.rows.map((rowStr, r) =>
        rowStr.split('').map((ch, c) => {
          const x = c * 4;
          const y = r * 4;
          if (ch === '#') {
            return (
              <rect
                key={`${r}-${c}`}
                x={x + 0.3}
                y={y + 0.3}
                width={3.4}
                height={3.4}
                fill={maze.themeColor}
                opacity={0.85}
                rx={0.5}
              />
            );
          }
          if (ch === 'D') {
            return (
              <rect
                key={`${r}-${c}`}
                x={x + 0.4}
                y={y + 0.4}
                width={3.2}
                height={3.2}
                fill="#F59E0B"
                rx={0.5}
              />
            );
          }
          if (ch === 'O') {
            return (
              <circle
                key={`${r}-${c}`}
                cx={x + 2}
                cy={y + 2}
                r={1.3}
                fill="#FDE047"
              />
            );
          }
          if (ch === 'S') {
            return (
              <circle
                key={`${r}-${c}`}
                cx={x + 2}
                cy={y + 2}
                r={1.2}
                fill="#34D399"
              />
            );
          }
          if (ch === '1') {
            return (
              <circle
                key={`${r}-${c}`}
                cx={x + 2}
                cy={y + 2}
                r={1.5}
                fill="#FB923C"
              />
            );
          }
          if (ch === '2') {
            return (
              <circle
                key={`${r}-${c}`}
                cx={x + 2}
                cy={y + 2}
                r={1.5}
                fill="#60A5FA"
              />
            );
          }
          return null;
        })
      )}
    </svg>
  );
};
