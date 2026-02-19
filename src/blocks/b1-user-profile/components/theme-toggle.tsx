'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export function ThemeToggle({ value, onChange }: Props) {
  const { theme, setTheme } = useTheme();
  const current = value ?? theme ?? 'system';

  const handleChange = (val: string) => {
    setTheme(val);
    onChange?.(val);
  };

  return (
    <div className="inline-flex rounded-md border bg-muted p-0.5 gap-0.5">
      {OPTIONS.map(({ value: v, label, icon: Icon }) => (
        <Button
          key={v}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleChange(v)}
          className={cn(
            'gap-1.5 rounded-sm px-3',
            current === v && 'bg-background shadow-sm'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
