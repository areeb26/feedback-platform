import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LocationsPage } from "../src/pages/tenant/LocationsPage";

describe("LocationsPage", () => {
  it("creates and lists locations", async () => {
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
          id: "loc_1",
          name: "Memon Goth",
          address: null,
          labels: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "loc_1",
            name: "Memon Goth",
            address: null,
            labels: [],
          },
        ],
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/settings"]}>
        <Routes>
          <Route path="/t/:slug/settings" element={<LocationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText("New location name"), "Memon Goth");
    await user.click(screen.getByRole("button", { name: "Add location" }));

    expect(await screen.findByText("Memon Goth")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/locations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Memon Goth" }),
      }),
    );
  });
});
