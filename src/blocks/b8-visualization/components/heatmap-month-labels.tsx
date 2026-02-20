'use client';

import { format, startOfMonth, eachMonthOfInterval, startOfYear, endOfYear, differenceInCalendarWeeks } from 'date-fns';

interface HeatmapMonthLabelsProps {
  year: number;
  cellSize: number;
  gap: number;
}

export function HeatmapMonthLabels({ year, cellSize, gap }: HeatmapMonthLabelsProps) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  return (
    <>
      {months.map((month) => {
        const weekOffset = differenceInCalendarWeeks(startOfMonth(month), yearStart, {
          weekStartsOn: 1,
        });
        const x = weekOffset * (cellSize + gap);

        return (
          <text
            key={month.toISOString()}
            x={x}
            y={-4}
            className="fill-muted-foreground"
            fontSize={10}
          >
            {format(month, 'MMM')}
          </text>
        );
      })}
    </>
  );
}
