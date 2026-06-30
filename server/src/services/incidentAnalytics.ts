type TimelineEvent = {
  status: "created" | "reviewed" | "resolved";
  at: Date;
};

export function minutesBetween(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function getTimelineEvent(
  timeline: TimelineEvent[],
  status: TimelineEvent["status"],
) {
  return timeline.find((event) => event.status === status);
}

export function calculateAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 10,
    ) / 10
  );
}

export function calculateTrend(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function severityBucket(rating: number | null | undefined) {
  if (rating === 1) return "oneStar" as const;
  if (rating === 2) return "twoStar" as const;
  if (rating === 3) return "threeStar" as const;
  return null;
}

export function reviewMinutes(timeline: TimelineEvent[]) {
  const created = getTimelineEvent(timeline, "created");
  const reviewed = getTimelineEvent(timeline, "reviewed");
  if (!created || !reviewed) {
    return null;
  }
  return minutesBetween(created.at, reviewed.at);
}

export function resolveMinutes(timeline: TimelineEvent[]) {
  const created = getTimelineEvent(timeline, "created");
  const resolved = getTimelineEvent(timeline, "resolved");
  if (!created || !resolved) {
    return null;
  }
  return minutesBetween(created.at, resolved.at);
}
