import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";
import { CompetitorAnalyticsPage } from "../src/pages/tenant/CompetitorAnalyticsPage";

const enabledShell: TenantShell = {
  slug: "hafiz-sweets",
  name: "Hafiz Sweets",
  logoUrl: null,
  primaryColor: "#7c3aed",
  featureFlags: {
    socialListening: false,
    competitorAnalytics: true,
    aiReplies: false,
    googleReviews: false,
  },
};

const disabledShell: TenantShell = {
  ...enabledShell,
  featureFlags: {
    ...enabledShell.featureFlags,
    competitorAnalytics: false,
  },
};

const analytics = {
  ownBusinessName: "Hafiz Sweets",
  columns: [
    { id: "own", name: "Hafiz Sweets", isOwnBusiness: true },
    { id: "comp_1", name: "Qasr e Shereen", isOwnBusiness: false },
  ],
  categories: [
    {
      category: "Food & Beverage",
      rank: 2,
      leaderName: "Qasr e Shereen",
      isLeading: false,
      cells: [
        { score: 80, reviewCount: 80 },
        { score: 100, reviewCount: 120 },
      ],
    },
    {
      category: "Ambiance",
      rank: 2,
      leaderName: "Qasr e Shereen",
      isLeading: false,
      cells: [
        { score: 80, reviewCount: 80 },
        { score: 100, reviewCount: 120 },
      ],
    },
    {
      category: "Amenities",
      rank: 2,
      leaderName: "Qasr e Shereen",
      isLeading: false,
      cells: [
        { score: 80, reviewCount: 80 },
        { score: 100, reviewCount: 120 },
      ],
    },
    {
      category: "Customer Service",
      rank: 2,
      leaderName: "Qasr e Shereen",
      isLeading: false,
      cells: [
        { score: 80, reviewCount: 80 },
        { score: 100, reviewCount: 120 },
      ],
    },
    {
      category: "Delivery Experience",
      rank: 2,
      leaderName: "Qasr e Shereen",
      isLeading: false,
      cells: [
        { score: 80, reviewCount: 80 },
        { score: 100, reviewCount: 120 },
      ],
    },
  ],
};

function renderPage(shell: TenantShell) {
  return render(
    <MemoryRouter initialEntries={["/t/hafiz-sweets/analytics/competitors"]}>
      <Routes>
        <Route
          path="/t/:slug"
          element={<Outlet context={{ shell }} />}
        >
          <Route
            path="analytics/competitors"
            element={<CompetitorAnalyticsPage />}
          />
          <Route path="overview" element={<div>Overview Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function mockFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (url.includes("/analytics/competitors")) {
        return Promise.resolve({ ok: true, json: async () => analytics });
      }
      if (url.includes("/competitors/refresh")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ refreshed: 1, failed: 0 }),
        });
      }
      if (url.includes("/competitors")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: "comp_1",
              name: "Qasr e Shereen",
              placeId: "ChIJ_competitor_1",
              rating: 5,
              reviewCount: 120,
              lastRefreshedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    }),
  );
}

describe("CompetitorAnalyticsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders comparison table and refresh action", async () => {
    mockFetch();
    renderPage(enabledShell);

    expect(
      await screen.findByText("Performance Categories Smile Scores"),
    ).toBeTruthy();
    expect(screen.getAllByText("Hafiz Sweets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Qasr e Shereen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("80").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText(/Refreshed 1 competitors/i)).toBeTruthy();
  });

  it("redirects to overview when feature flag is disabled", async () => {
    renderPage(disabledShell);

    expect(await screen.findByText("Overview Page")).toBeTruthy();
    expect(screen.queryByText("Performance Categories Smile Scores")).toBeNull();
  });
});
