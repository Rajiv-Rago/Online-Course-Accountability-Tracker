'use client';

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useChartTheme } from '../lib/chart-config';
import { formatDateShort } from '../lib/date-utils';
import type { ForecastResult } from '../lib/forecast-calculator';

interface CompletionForecastProps {
  forecast: ForecastResult;
  targetDate: string | null;
}

const STATUS_CONFIG = {
  ahead: { label: 'Ahead of Schedule', variant: 'default' as const, className: 'bg-blue-500' },
  on_track: { label: 'On Track', variant: 'default' as const, className: 'bg-green-500' },
  behind: { label: 'Behind Schedule', variant: 'destructive' as const, className: '' },
  stalled: { label: 'Stalled', variant: 'secondary' as const, className: '' },
  insufficient_data: { label: 'Insufficient Data', variant: 'secondary' as const, className: '' },
};

export function CompletionForecastChart({ forecast, targetDate }: CompletionForecastProps) {
  const theme = useChartTheme();
  const statusConfig = STATUS_CONFIG[forecast.status];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant={statusConfig.variant} className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
        {forecast.predictedDate && (
          <span className="text-xs text-muted-foreground">
            Predicted: {formatDateShort(forecast.predictedDate)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={forecast.projectedPoints}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: theme.axis }}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
            tickFormatter={formatDateShort}
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
            labelFormatter={formatDateShort}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                actual: 'Actual',
                projected: 'Projected',
                ci70Upper: '70% CI Upper',
                ci70Lower: '70% CI Lower',
                ci90Upper: '90% CI Upper',
                ci90Lower: '90% CI Lower',
              };
              return [`${value.toFixed(1)}h`, labels[name] ?? name];
            }}
          />

          {/* 90% confidence band */}
          <Area
            type="monotone"
            dataKey="ci90Upper"
            stroke="none"
            fill="#dbeafe"
            fillOpacity={0.4}
          />
          <Area
            type="monotone"
            dataKey="ci90Lower"
            stroke="none"
            fill={theme.background}
            fillOpacity={1}
          />

          {/* 70% confidence band */}
          <Area
            type="monotone"
            dataKey="ci70Upper"
            stroke="none"
            fill="#93c5fd"
            fillOpacity={0.4}
          />
          <Area
            type="monotone"
            dataKey="ci70Lower"
            stroke="none"
            fill={theme.background}
            fillOpacity={1}
          />

          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />

          {/* Projected line */}
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />

          {/* Target date line */}
          {targetDate && (
            <ReferenceLine
              x={targetDate}
              stroke="#16a34a"
              strokeWidth={1.5}
              label={{ value: 'Target', position: 'top', fontSize: 10, fill: '#16a34a' }}
            />
          )}

          {/* Predicted date line */}
          {forecast.predictedDate && (
            <ReferenceLine
              x={forecast.predictedDate}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: 'Predicted', position: 'top', fontSize: 10, fill: '#f59e0b' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
