'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useChartTheme } from '../lib/chart-config';
import { riskZoneColors, riskZoneColorsDark } from '../lib/chart-colors';
import { formatDateShort } from '../lib/date-utils';
import type { RiskDataPoint } from '../hooks/use-risk-trend';

interface RiskTrendChartProps {
  data: RiskDataPoint[];
  courseColors: Map<string, string>;
  courses: { id: string; title: string; color: string }[];
}

export function RiskTrendChart({ data, courseColors, courses }: RiskTrendChartProps) {
  const theme = useChartTheme();
  const { resolvedTheme } = useTheme();
  const [viewMode, setViewMode] = useState<'aggregate' | 'per-course'>('aggregate');
  const isDark = resolvedTheme === 'dark';

  const zones = isDark ? riskZoneColorsDark : riskZoneColors;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Button
          variant={viewMode === 'aggregate' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 text-xs"
          onClick={() => setViewMode('aggregate')}
        >
          Aggregate
        </Button>
        <Button
          variant={viewMode === 'per-course' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 text-xs"
          onClick={() => setViewMode('per-course')}
        >
          Per Course
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          {/* Risk zone background bands */}
          <ReferenceArea y1={0} y2={25} fill={zones.low.bg} fillOpacity={0.5} />
          <ReferenceArea y1={25} y2={50} fill={zones.moderate.bg} fillOpacity={0.5} />
          <ReferenceArea y1={50} y2={75} fill={zones.high.bg} fillOpacity={0.5} />
          <ReferenceArea y1={75} y2={100} fill={zones.critical.bg} fillOpacity={0.5} />

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
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: theme.axis }}
            tickLine={false}
            axisLine={false}
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
              if (name === 'aggregate') return [value, 'Average Risk'];
              const course = courses.find((c) => c.id === name);
              return [value, course?.title ?? name];
            }}
          />

          {viewMode === 'aggregate' ? (
            <Line
              type="monotone"
              dataKey="aggregate"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : (
            <>
              <Legend
                formatter={(value) => {
                  const course = courses.find((c) => c.id === value);
                  return <span className="text-xs">{course?.title ?? value}</span>;
                }}
              />
              {courses.map((course) => (
                <Line
                  key={course.id}
                  type="monotone"
                  dataKey={course.id}
                  name={course.id}
                  stroke={courseColors.get(course.id) ?? course.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
