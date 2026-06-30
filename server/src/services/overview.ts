export function calculateSmileScore(ratings: number[]) {
  if (ratings.length === 0) {
    return 0;
  }
  const average =
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return Math.round((average / 5) * 100);
}

export function calculateRatingBreakdown(ratings: number[]) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings) {
    const stars = Math.min(5, Math.max(1, Math.round(rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    counts[stars] += 1;
  }

  const total = ratings.length;
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars as 1 | 2 | 3 | 4 | 5],
    percent: total === 0 ? 0 : Math.round((counts[stars as 1 | 2 | 3 | 4 | 5] / total) * 1000) / 10,
  }));
}

export function calculateResolvedPercent(
  incidents: Array<{ status: string }>,
) {
  if (incidents.length === 0) {
    return 0;
  }
  const resolved = incidents.filter(
    (incident) => incident.status === "resolved",
  ).length;
  return Math.round((resolved / incidents.length) * 1000) / 10;
}

export function calculateTrend(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}
