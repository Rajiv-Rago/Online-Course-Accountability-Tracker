'use client';

import { memo } from 'react';
import type { HeatmapCell } from '../lib/heatmap-utils';

interface HeatmapDayCellProps {
  cell: HeatmapCell;
  colors: string[];
  cellSize: number;
  gap: number;
  onHover: (cell: HeatmapCell | null, x: number, y: number) => void;
  onClick: (cell: HeatmapCell) => void;
}

export const HeatmapDayCell = memo(function HeatmapDayCell({
  cell,
  colors,
  cellSize,
  gap,
  onHover,
  onClick,
}: HeatmapDayCellProps) {
  const x = cell.weekIndex * (cellSize + gap);
  const y = cell.dayOfWeek * (cellSize + gap);

  return (
    <rect
      x={x}
      y={y}
      width={cellSize}
      height={cellSize}
      rx={2}
      fill={colors[cell.level]}
      className="cursor-pointer transition-opacity hover:opacity-80"
      onMouseEnter={(e) => {
        const rect = (e.target as SVGRectElement).getBoundingClientRect();
        onHover(cell, rect.left + rect.width / 2, rect.top);
      }}
      onMouseLeave={() => onHover(null, 0, 0)}
      onClick={() => onClick(cell)}
    />
  );
});
