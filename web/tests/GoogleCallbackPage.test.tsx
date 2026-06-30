import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GoogleCallbackPage } from "../src/pages/GoogleCallbackPage";

describe("GoogleCallbackPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("completes OAuth for the stored tenant slug", async () => {
    window.sessionStorage.setItem("google_oauth_state", "state_1");
    window.sessionStorage.setItem("google_oauth_tenant_slug", "hafiz-sweets");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "connected",
        accountId: "accounts/123",
        reviewCount: 0,
        averageRating: 0,
        errorMessage: null,
        connectedAt: "2026-06-30T13:50:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter
        initialEntries={["/google/callback?code=code_1&state=state_1"]}
      >
        <Routes>
          <Route path="/google/callback" element={<GoogleCallbackPage />} />
          <Route
            path="/t/:slug/reviews"
            element={<div>Reviews destination</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Reviews destination")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/google/callback",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"code":"code_1"'),
      }),
    );
    await waitFor(() =>
      expect(window.sessionStorage.getItem("google_oauth_state")).toBeNull(),
    );
  });
});
