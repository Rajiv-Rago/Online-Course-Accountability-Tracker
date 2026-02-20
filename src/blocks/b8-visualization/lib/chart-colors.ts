// 10 distinct, color-blind safe colors for course differentiation
export const courseColors = [
  '#2563eb', // blue-600
  '#dc2626', // red-600
  '#16a34a', // green-600
  '#9333ea', // purple-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#c026d3', // fuchsia-600
  '#ca8a04', // yellow-600
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
];

export function getCourseColor(courseIndex: number): string {
  return courseColors[courseIndex % courseColors.length];
}

export const riskZoneColors = {
  low: { bg: '#dcfce7', line: '#16a34a' },
  moderate: { bg: '#fef9c3', line: '#ca8a04' },
  high: { bg: '#ffedd5', line: '#ea580c' },
  critical: { bg: '#fecaca', line: '#dc2626' },
};

export const riskZoneColorsDark = {
  low: { bg: 'rgba(22,163,74,0.15)', line: '#4ade80' },
  moderate: { bg: 'rgba(202,138,4,0.15)', line: '#facc15' },
  high: { bg: 'rgba(234,88,12,0.15)', line: '#fb923c' },
  critical: { bg: 'rgba(220,38,38,0.15)', line: '#f87171' },
};

export const heatmapColorsLight = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
export const heatmapColorsDark = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
