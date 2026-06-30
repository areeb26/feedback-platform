import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GoogleCallbackPage } from "../src/pages/GoogleCallbackPage";

const connectedResponse = {
  status: "connected",
  accountId: "accounts/123",
  reviewCount: 65,
  averageRating: 4.3,
  errorMessage: null,
  connectedAt: "2026-06-01T00:00:00.000Z",
};

describe("GoogleCallbackPage", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("completes the callback and returns to the tenant reviews page", async () => {
    window.sessionStorage.setItem("google_oauth_state", "state_123");
    window.sessionStorage.setItem("google_oauth_slug", "hafiz-sweets");
    window.sessionStorage.setItem(
      "google_oauth_return_to",
      "/t/hafiz-sweets/reviews",
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => connectedResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter
        initialEntries={["/google/callback?code=auth_code&state=state_123"]}
      >
        <Routes>
          <Route path="/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/t/:slug/reviews" element={<div>Reviews returned</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Reviews returned")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/google/callback",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("auth_code"),
      }),
    );
  });

  it("shows an error when the OAuth state does not match", async () => {
    window.sessionStorage.setItem("google_oauth_state", "state_123");
    window.sessionStorage.setItem("google_oauth_slug", "hafiz-sweets");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter
        initialEntries={["/google/callback?code=auth_code&state=wrong_state"]}
      >
        <Routes>
          <Route path="/google/callback" element={<GoogleCallbackPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Could not verify Google connection state."),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
