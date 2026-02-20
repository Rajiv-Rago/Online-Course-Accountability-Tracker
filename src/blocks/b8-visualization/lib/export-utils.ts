import { toast } from 'sonner';

export async function exportChartAsPng(
  element: HTMLElement,
  filename: string = 'chart',
): Promise<void> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: null,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    toast.error('Export failed, please try again');
  }
}
