'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { heatmapColorsLight, heatmapColorsDark } from '../lib/chart-colors';
import { HeatmapDayCell } from './heatmap-day-cell';
import { HeatmapTooltip } from './heatmap-tooltip';
import { HeatmapMonthLabels } from './heatmap-month-labels';
import { HeatmapDayLabels } from './heatmap-day-labels';
import { HeatmapLegend } from './heatmap-legend';
import type { HeatmapCell } from '../lib/heatmap-utils';

interface StudyHeatmapProps {
  cells: HeatmapCell[];
  totalWeeks: number;
  year: number;
  onDayClick?: (cell: HeatmapCell) => void;
}

export function StudyHeatmap({ cells, totalWeeks, year, onDayClick }: StudyHeatmapProps) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === 'dark' ? heatmapColorsDark : heatmapColorsLight;

  const [hoveredCell, setHoveredCell] = useState<{
    cell: HeatmapCell;
    x: number;
    y: number;
  } | null>(null);

  const cellSize = 12;
  const gap = 3;

  const svgWidth = totalWeeks * (cellSize + gap) + 30; // 30 for left label space
  const svgHeight = 7 * (cellSize + gap) + 20; // 20 for top label space

  const handleHover = useCallback(
    (cell: HeatmapCell | null, x: number, y: number) => {
      if (cell) {
        setHoveredCell({ cell, x, y });
      } else {
        setHoveredCell(null);
      }
    },
    [],
  );

  const handleClick = useCallback(
    (cell: HeatmapCell) => {
      onDayClick?.(cell);
    },
    [onDayClick],
  );

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="min-w-fit"
        >
          <g transform="translate(30, 16)">
            <HeatmapMonthLabels year={year} cellSize={cellSize} gap={gap} />
            <HeatmapDayLabels cellSize={cellSize} gap={gap} />
            {cells.map((cell) => (
              <HeatmapDayCell
                key={cell.date}
                cell={cell}
                colors={colors}
                cellSize={cellSize}
                gap={gap}
                onHover={handleHover}
                onClick={handleClick}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="flex justify-end mt-2">
        <HeatmapLegend colors={colors} />
      </div>
      {hoveredCell && (
        <HeatmapTooltip
          cell={hoveredCell.cell}
          x={hoveredCell.x}
          y={hoveredCell.y}
        />
      )}
    </div>
  );
}
