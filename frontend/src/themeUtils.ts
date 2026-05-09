export const DIMENSION_COLORS = [
  '#be185d', // pink-700
  '#6d28d9', // violet-700
  '#1d4ed8', // blue-700
  '#047857', // emerald-700
  '#b45309', // amber-700
  '#b91c1c', // red-700
  '#0e7490', // cyan-700
  '#4d7c0f', // lime-700
  '#be123c', // rose-700
  '#4338ca', // indigo-700
];

export function getDimensionColor(dimension: number) {
  return DIMENSION_COLORS[dimension % DIMENSION_COLORS.length];
}
