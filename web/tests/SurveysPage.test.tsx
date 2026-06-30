import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SurveysPage } from "../src/pages/tenant/SurveysPage";

describe("SurveysPage", () => {
  it("shows surveys table and creates a survey", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "survey_1",
          name: "Call Centre Survey",
          previewSlug: "abc123",
          previewPath: "/s/abc123",
          locationId: null,
          submissionCount: 0,
          createdAt: "2026-05-25T14:53:00.000Z",
          questions: [
            {
              id: "q1",
              type: "rating",
              label: "Overall experience",
              required: true,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "survey_1",
            name: "Call Centre Survey",
            previewSlug: "abc123",
            previewPath: "/s/abc123",
            locationId: null,
            submissionCount: 0,
            createdAt: "2026-05-25T14:53:00.000Z",
            questions: [
              {
                id: "q1",
                type: "rating",
                label: "Overall experience",
                required: true,
              },
            ],
          },
        ],
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/surveys"]}>
        <Routes>
          <Route path="/t/:slug/surveys" element={<SurveysPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("Survey name"), "Call Centre Survey");
    await user.click(screen.getByRole("button", { name: "+ New Survey" }));

    expect(await screen.findByText("Call Centre Survey")).toBeTruthy();
    const previewLink = screen.getByRole("link", { name: "Preview Link" });
    expect(previewLink.getAttribute("href")).toBe("/s/abc123");
  });
});
