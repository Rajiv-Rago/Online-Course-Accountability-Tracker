'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useChartRange, type ChartRange } from '../hooks/use-chart-range';
import type { RangePreset } from '../lib/date-utils';

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

export function ChartRangeSelector() {
  const { range, setRange, setCustomRange } = useChartRange();
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      setCustomRange(customStart.toISOString(), customEnd.toISOString());
      setPopoverOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Tabs
        value={range === 'custom' ? '' : range}
        onValueChange={(v) => setRange(v as RangePreset)}
      >
        <TabsList className="h-8">
          {PRESETS.map((p) => (
            <TabsTrigger key={p.value} value={p.value} className="text-xs px-2.5 h-6">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={range === 'custom' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1" />
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium">Start Date</p>
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                disabled={(date) => date > new Date()}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">End Date</p>
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                disabled={(date) => date > new Date() || (customStart ? date < customStart : false)}
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleApplyCustom}
              disabled={!customStart || !customEnd}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
