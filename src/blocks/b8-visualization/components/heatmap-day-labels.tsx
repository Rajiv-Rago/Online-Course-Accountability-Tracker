'use client';

interface HeatmapDayLabelsProps {
  cellSize: number;
  gap: number;
}

const LABELS = [
  { day: 0, label: 'Mon' },
  { day: 2, label: 'Wed' },
  { day: 4, label: 'Fri' },
];

export function HeatmapDayLabels({ cellSize, gap }: HeatmapDayLabelsProps) {
  return (
    <>
      {LABELS.map(({ day, label }) => (
        <text
          key={label}
          x={-8}
          y={day * (cellSize + gap) + cellSize / 2}
          textAnchor="end"
          dominantBaseline="central"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {label}
        </text>
      ))}
    </>
  );
}
