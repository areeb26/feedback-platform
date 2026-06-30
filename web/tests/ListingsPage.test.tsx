import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ListingsPage } from "../src/pages/tenant/ListingsPage";

describe("ListingsPage", () => {
  it("shows listings table when data exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/google/status")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: "connected",
              accountId: "accounts/123",
              reviewCount: 65,
              averageRating: 4.3,
              errorMessage: null,
              connectedAt: "2026-06-01T00:00:00.000Z",
            }),
          });
        }
        if (url.includes("/listings")) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: "listing_1",
                directory: "google",
                name: "Hafiz Sweets",
                rating: 4.3,
                reviewCount: 65,
                locationId: "loc_1",
                locationName: "Hafiz Sweets",
              },
            ],
          });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/listings"]}>
        <Routes>
          <Route path="/t/:slug/listings" element={<ListingsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Google")).toBeTruthy();
    expect(screen.getAllByText("Hafiz Sweets").length).toBeGreaterThan(0);
    expect(screen.getByText("65")).toBeTruthy();
  });

  it("shows empty state when Google is not connected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/google/status")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              status: "disconnected",
              accountId: null,
              reviewCount: 0,
              averageRating: 0,
              errorMessage: null,
              connectedAt: null,
            }),
          });
        }
        if (url.includes("/listings")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/listings"]}>
        <Routes>
          <Route path="/t/:slug/listings" element={<ListingsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/not yet connected to Google My Business/i),
    ).toBeTruthy();
  });
});
