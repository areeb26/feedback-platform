import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { bilingualLabel } from "@feedback-platform/shared";
import { SurveyPreviewPage } from "../src/pages/public/SurveyPreviewPage";

describe("SurveyPreviewPage", () => {
  it("submits public survey feedback", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "Call Centre Survey",
          tenantName: "Hafiz Sweets",
          primaryColor: "#7c3aed",
          questions: [
            {
              id: "q1",
              type: "rating",
              label: bilingualLabel("Overall experience", "مجموعی تجربہ"),
              required: true,
            },
          ],
          followUp: {
            enabled: true,
            triggerMaxRating: 3,
            choicesByChannel: {
              in_store: [
                {
                  id: "food_quality",
                  label: bilingualLabel("Food quality", "کھانے کا معیار"),
                },
              ],
              takeaway: [],
              delivery: [],
            },
          },
          channel: "in_store",
          locationId: null,
          locationName: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          submissionId: "sub_1",
          message: "Thank you for your feedback",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/s/abc123?channel=in_store"]}>
        <Routes>
          <Route path="/s/:previewSlug" element={<SurveyPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Submit feedback" }));

    expect(await screen.findByText("Thank you!")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/surveys/abc123/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
