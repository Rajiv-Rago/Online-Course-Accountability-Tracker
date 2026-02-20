'use client';

import { formatDateFull } from '../lib/date-utils';
import type { HeatmapCell } from '../lib/heatmap-utils';

interface HeatmapTooltipProps {
  cell: HeatmapCell;
  x: number;
  y: number;
}

export function HeatmapTooltip({ cell, x, y }: HeatmapTooltipProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none bg-popover text-popover-foreground border rounded-md shadow-md px-3 py-2 text-xs"
      style={{
        left: x,
        top: y - 8,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <p className="font-medium">{formatDateFull(cell.date)}</p>
      <p className="text-muted-foreground">
        {cell.minutes > 0
          ? `${cell.minutes} minutes (${cell.sessionCount} session${cell.sessionCount !== 1 ? 's' : ''})`
          : 'No study activity'}
      </p>
    </div>
  );
}
