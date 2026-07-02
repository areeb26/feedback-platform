import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseAnalyticsDateRange } from "../src/services/analytics/dateRange.js";

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

describe("parseAnalyticsDateRange", () => {
  it("mirrors the previous period for trend comparison", () => {
    const result = parseAnalyticsDateRange(
      {
        startDate: "2026-06-01T00:00:00.000Z",
        endDate: "2026-06-30T23:59:59.999Z",
      },
      querySchema,
    );

    expect(result.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(result.end.toISOString()).toBe("2026-06-30T23:59:59.999Z");
    expect(result.previousEnd.toISOString()).toBe("2026-05-31T23:59:59.999Z");
    expect(result.previousStart.toISOString()).toBe("2026-05-02T00:00:00.000Z");
  });
});
