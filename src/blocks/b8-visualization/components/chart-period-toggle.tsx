'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChartPeriodToggleProps {
  value: 'day' | 'week' | 'month';
  onChange: (period: 'day' | 'week' | 'month') => void;
}

export function ChartPeriodToggle({ value, onChange }: ChartPeriodToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as 'day' | 'week' | 'month')}>
      <TabsList className="h-7">
        <TabsTrigger value="day" className="text-xs px-2 h-5">
          Day
        </TabsTrigger>
        <TabsTrigger value="week" className="text-xs px-2 h-5">
          Week
        </TabsTrigger>
        <TabsTrigger value="month" className="text-xs px-2 h-5">
          Month
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
