'use client';

interface HeatmapLegendProps {
  colors: string[];
}

export function HeatmapLegend({ colors }: HeatmapLegendProps) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>Less</span>
      {colors.map((color, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: color }}
        />
      ))}
      <span>More</span>
    </div>
  );
}
