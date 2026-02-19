'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleChecklistProps {
  count: number;
  onChange: (count: number) => void;
}

export function ModuleChecklist({ count, onChange }: ModuleChecklistProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Modules completed this session
      </label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(Math.max(0, count - 1))}
          disabled={count <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-2xl font-semibold tabular-nums w-12 text-center">
          {count}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onChange(count + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
