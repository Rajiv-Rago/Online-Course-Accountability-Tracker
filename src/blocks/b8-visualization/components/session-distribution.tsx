'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../lib/chart-config';
import type { DistributionBucket } from '../lib/chart-utils';

interface SessionDistributionProps {
  data: DistributionBucket[];
  averageDuration: number;
}

export function SessionDistributionChart({
  data,
  averageDuration,
}: SessionDistributionProps) {
  const theme = useChartTheme();

  // Find the bucket that contains the average
  const avgBucket = data.find(
    (b) => averageDuration >= b.min && averageDuration <= b.max,
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.tooltip.background,
            borderColor: theme.tooltip.border,
            color: theme.tooltip.text,
            fontSize: 12,
            borderRadius: 8,
          }}
          formatter={(value: number) => [`${value} sessions`, 'Count']}
        />
        {avgBucket && (
          <ReferenceLine
            x={avgBucket.bucket}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{
              value: `Avg: ${averageDuration}min`,
              position: 'top',
              fontSize: 10,
              fill: '#ef4444',
            }}
          />
        )}
        <Bar
          dataKey="count"
          fill="#6366f1"
          radius={[4, 4, 0, 0]}
          name="Sessions"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
