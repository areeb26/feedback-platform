import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IncidentAnalyticsPage } from "../src/pages/tenant/IncidentAnalyticsPage";

const analyticsFixture = {
  totalIncidents: 1,
  totalIncidentsTrend: 1,
  resolvedIncidents: 1,
  resolvedIncidentsTrend: 1,
  avgReviewTimeMinutes: 8667,
  avgReviewTimeTrend: 8667,
  avgResolveTimeMinutes: 8670,
  avgResolveTimeTrend: 8670,
  newIncidentsByDate: [
    { date: "2026-06-11", oneStar: 1, twoStar: 0, threeStar: 0 },
  ],
  responseTimeTrend: [
    {
      date: "2026-06-11",
      avgReviewTimeMinutes: 8667,
      avgResolveTimeMinutes: 8670,
    },
  ],
  staffPerformance: [
    {
      staffMember: "user_1",
      submissions: 1,
      incidentsCreated: 1,
      reviewed: 1,
      resolved: 1,
      avgReviewMinutes: 8667,
      avgResolveMinutes: 8670,
      percentResolved: 100,
    },
  ],
};

describe("IncidentAnalyticsPage", () => {
  it("shows KPI cards, charts, and staff table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/analytics/incidents")) {
          return Promise.resolve({
            ok: true,
            json: async () => analyticsFixture,
          });
        }
        if (url.includes("/locations")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/analytics/incidents"]}>
        <Routes>
          <Route
            path="/t/:slug/analytics/incidents"
            element={<IncidentAnalyticsPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Incident Analytics")).toBeTruthy();
    expect(screen.getByText("Total Incidents")).toBeTruthy();
    expect(screen.getByText("Resolved Incidents")).toBeTruthy();
    expect(screen.getByText("New Incidents")).toBeTruthy();
    expect(
      screen.getByText("Average Review & Resolve Times"),
    ).toBeTruthy();
    expect(screen.getByText("Staff Performance")).toBeTruthy();
    expect(screen.getByText("user_1")).toBeTruthy();
    expect(screen.getAllByText("6d 27m").length).toBeGreaterThan(0);
  });
});
