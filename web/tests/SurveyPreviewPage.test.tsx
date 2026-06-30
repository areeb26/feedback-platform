import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SurveyPreviewPage } from "../src/pages/public/SurveyPreviewPage";

describe("SurveyPreviewPage", () => {
  it("shows public survey preview", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: "Call Centre Survey",
          tenantName: "Hafiz Sweets",
          primaryColor: "#7c3aed",
          questions: [
            {
              id: "q1",
              type: "rating",
              label: "Overall experience",
              required: true,
            },
          ],
        }),
      }),
    );

    render(
      <MemoryRouter initialEntries={["/s/abc123"]}>
        <Routes>
          <Route path="/s/:previewSlug" element={<SurveyPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Call Centre Survey")).toBeTruthy();
    expect(screen.getByText("Hafiz Sweets")).toBeTruthy();
    expect(screen.getByText("Overall experience (rating)")).toBeTruthy();
  });
});
