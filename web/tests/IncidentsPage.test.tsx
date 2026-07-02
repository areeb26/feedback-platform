import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IncidentsPage } from "../src/pages/tenant/IncidentsPage";

const incident = {
  id: "inc_1",
  code: "HAF-260610-0001",
  status: "created" as const,
  timeline: [{ status: "created" as const, at: "2026-06-10T14:57:00.000Z" }],
  createdAt: "2026-06-10T14:57:00.000Z",
  rating: 1,
  surveyName: "Branch Takeaway Survey",
  locationName: "Memon Goth",
  customerEmail: null,
  channel: "delivery",
  issueCategory: "packaging",
  assignees: [],
};

describe("IncidentsPage", () => {
  it("shows incidents and marks one reviewed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [incident] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...incident,
          status: "reviewed",
          timeline: [
            incident.timeline[0],
            { status: "reviewed", at: "2026-06-10T15:00:00.000Z" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            ...incident,
            status: "reviewed",
            timeline: [
              incident.timeline[0],
              { status: "reviewed", at: "2026-06-10T15:00:00.000Z" },
            ],
          },
        ],
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/incidents"]}>
        <Routes>
          <Route path="/t/:slug/incidents" element={<IncidentsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("HAF-260610-0001")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mark reviewed" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/incidents/inc_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "reviewed" }),
      }),
    );
  });
});
