import type { z } from "zod";

type DateRangeFilters = {
  startDate?: string;
  endDate?: string;
};

export function parseAnalyticsDateRange<T extends z.ZodType<DateRangeFilters>>(
  query: Record<string, unknown>,
  schema: T,
) {
  const filters = schema.parse(query);
  const end = filters.endDate ? new Date(filters.endDate) : new Date();
  const start = filters.startDate
    ? new Date(filters.startDate)
    : new Date(end.getFullYear(), end.getMonth(), 1);

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    start,
    end,
    previousStart,
    previousEnd,
    filters,
  };
}
