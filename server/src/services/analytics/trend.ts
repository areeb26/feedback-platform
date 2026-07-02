export function calculateTrend(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}
