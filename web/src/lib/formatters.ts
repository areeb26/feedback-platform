export function formatTrend(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value}`;
}
