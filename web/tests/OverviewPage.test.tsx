import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { OverviewPage } from "../src/pages/tenant/OverviewPage";

const overviewFixture = {
  smileScore: 60,
  smileScoreTrend: 10,
  submissions: 2,
  submissionsTrend: 2,
  totalIncidents: 1,
  totalIncidentsTrend: 1,
  resolvedPercent: 100,
  resolvedPercentTrend: 100,
  targetSmileScore: 100,
  ratingBreakdown: [
    { stars: 5, count: 1, percent: 50 },
    { stars: 4, count: 0, percent: 0 },
    { stars: 3, count: 0, percent: 0 },
    { stars: 2, count: 0, percent: 0 },
    { stars: 1, count: 1, percent: 50 },
  ],
  thirdPartyReviews: [
    {
      source: "google",
      name: "Google",
      reviewCount: 79,
      averageRating: 4.1,
      trend: 0,
      connected: true,
      errorMessage: null,
    },
    {
      source: "foodpanda",
      name: "Food Panda",
      reviewCount: 0,
      averageRating: 0,
      trend: 0,
      connected: false,
      errorMessage: null,
    },
  ],
};

function OverviewTestLayout() {
  return (
    <Outlet
      context={{
        shell: {
          slug: "hafiz-sweets",
          name: "Hafiz Sweets",
          logoUrl: null,
          primaryColor: "#7c3aed",
        },
      }}
    />
  );
}

describe("OverviewPage", () => {
  it("shows KPI cards and rating breakdown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/overview")) {
          return Promise.resolve({
            ok: true,
            json: async () => overviewFixture,
          });
        }
        if (url.includes("/locations")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        if (url.includes("/surveys")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/overview"]}>
        <Routes>
          <Route path="/t/:slug" element={<OverviewTestLayout />}>
            <Route path="overview" element={<OverviewPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Rating Breakdown")).toBeTruthy();
    expect(screen.getAllByText("Smile Score").length).toBeGreaterThan(0);
    expect(screen.getByText("3rd Party Reviews")).toBeTruthy();
  });

  it("shows empty state for new tenants", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/overview")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ...overviewFixture,
              smileScore: 0,
              submissions: 0,
              totalIncidents: 0,
              resolvedPercent: 0,
              ratingBreakdown: overviewFixture.ratingBreakdown.map((row) => ({
                ...row,
                count: 0,
                percent: 0,
              })),
            }),
          });
        }
        if (url.includes("/locations")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        if (url.includes("/surveys")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/overview"]}>
        <Routes>
          <Route path="/t/:slug" element={<OverviewTestLayout />}>
            <Route path="overview" element={<OverviewPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("No feedback data yet for this period."),
    ).toBeTruthy();
  });
});
