'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallback } from 'react';
import { exportChartAsPng } from '../lib/export-utils';

interface ExportChartButtonProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

export function ExportChartButton({ chartRef, filename = 'chart' }: ExportChartButtonProps) {
  const handleExport = useCallback(() => {
    if (chartRef.current) {
      exportChartAsPng(chartRef.current, filename);
    }
  }, [chartRef, filename]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleExport}
      title="Export as PNG"
    >
      <Download className="h-3.5 w-3.5" />
    </Button>
  );
}
