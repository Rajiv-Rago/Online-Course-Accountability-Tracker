'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../lib/chart-config';
import type { GroupedHoursPoint } from '../lib/chart-utils';

interface StudyHoursBarChartProps {
  data: GroupedHoursPoint[];
  courses: { id: string; title: string; color: string }[];
  goalLineHours: number;
}

export function StudyHoursBarChart({
  data,
  courses,
  goalLineHours,
}: StudyHoursBarChartProps) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={{ stroke: theme.grid }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: theme.axis }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}h`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.tooltip.background,
            borderColor: theme.tooltip.border,
            color: theme.tooltip.text,
            fontSize: 12,
            borderRadius: 8,
          }}
          formatter={(value: number, name: string) => {
            const course = courses.find((c) => c.id === name);
            return [`${(value as number).toFixed(1)}h`, course?.title ?? name];
          }}
        />
        <Legend
          formatter={(value) => {
            const course = courses.find((c) => c.id === value);
            return <span className="text-xs">{course?.title ?? value}</span>;
          }}
        />
        {goalLineHours > 0 && (
          <ReferenceLine
            y={goalLineHours}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: 'Goal', position: 'right', fontSize: 10, fill: '#ef4444' }}
          />
        )}
        {courses.map((course) => (
          <Bar
            key={course.id}
            dataKey={course.id}
            name={course.id}
            fill={course.color}
            stackId="hours"
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
