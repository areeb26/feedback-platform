import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
              label: "Overall experience",
              required: true,
            },
          ],
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
      <MemoryRouter initialEntries={["/s/abc123"]}>
        <Routes>
          <Route path="/s/:previewSlug" element={<SurveyPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Name"), "Areeb");
    await user.type(screen.getByLabelText("Phone"), "+923001234567");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(await screen.findByText("Thank you!")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/surveys/abc123/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
