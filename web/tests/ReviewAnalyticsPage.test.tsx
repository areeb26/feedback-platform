import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReviewAnalyticsPage } from "../src/pages/tenant/ReviewAnalyticsPage";

const analyticsFixture = {
  totalReviews: 3,
  totalReviewsTrend: 3,
  averageRating: 3.33,
  averageRatingTrend: 3.33,
  replyRate: 0,
  replyRateTrend: 0,
  repliedCount: 0,
  positiveReviewsPercent: 66.7,
  positiveReviewsTrend: 66.7,
  positiveReviewsCount: 2,
  ratingsByDate: [
    { date: "2026-06-29", one: 1, two: 0, three: 0, four: 0, five: 0 },
    { date: "2026-06-30", one: 0, two: 0, three: 0, four: 1, five: 1 },
  ],
  listingsBreakdown: [
    {
      listingName: "Hafiz Sweets",
      reviews: 2,
      rating: 2.5,
      positivePercent: 50,
      positiveCount: 1,
      negativePercent: 50,
      negativeCount: 1,
      replyRate: 0,
      repliedCount: 0,
    },
  ],
  labelsBreakdown: [],
};

describe("ReviewAnalyticsPage", () => {
  it("shows KPI cards, chart, and listings table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => analyticsFixture,
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/analytics/reviews"]}>
        <Routes>
          <Route
            path="/t/:slug/analytics/reviews"
            element={<ReviewAnalyticsPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Review Analytics")).toBeTruthy();
    expect(screen.getByText("Total Reviews")).toBeTruthy();
    expect(screen.getByText("Average Rating")).toBeTruthy();
    expect(screen.getByText("Review Ratings")).toBeTruthy();
    expect(screen.getByText("Hafiz Sweets")).toBeTruthy();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });
});
