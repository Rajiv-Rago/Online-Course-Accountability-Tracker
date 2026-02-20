'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../lib/chart-config';
import { formatDateShort } from '../lib/date-utils';
import type { ProgressDataPoint } from '../hooks/use-progress-timeline';

interface ProgressLineChartProps {
  data: ProgressDataPoint[];
  courses: { id: string; title: string; color: string; targetDate?: string | null }[];
}

export function ProgressLineChart({ data, courses }: ProgressLineChartProps) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
          tickFormatter={formatDateShort}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.tooltip.background,
            borderColor: theme.tooltip.border,
            color: theme.tooltip.text,
            fontSize: 12,
            borderRadius: 8,
          }}
          labelFormatter={formatDateShort}
          formatter={(value: number, name: string) => {
            const course = courses.find((c) => c.id === name);
            return [`${value}%`, course?.title ?? name];
          }}
        />
        <Legend
          formatter={(value) => {
            const course = courses.find((c) => c.id === value);
            return <span className="text-xs">{course?.title ?? value}</span>;
          }}
        />
        {courses.map((course) =>
          course.targetDate ? (
            <ReferenceLine
              key={`target-${course.id}`}
              x={course.targetDate}
              stroke={course.color}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
          ) : null,
        )}
        {courses.map((course) => (
          <Line
            key={course.id}
            type="monotone"
            dataKey={course.id}
            name={course.id}
            stroke={course.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
