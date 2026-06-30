import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CustomersPage } from "../src/pages/tenant/CustomersPage";

describe("CustomersPage", () => {
  it("shows customers table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "cust_1",
            name: "Areeb",
            email: null,
            phone: "+923001234567",
            mostRecentLocation: "Memon Goth",
            createdAt: "2026-06-10T14:57:00.000Z",
          },
        ],
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/customers"]}>
        <Routes>
          <Route path="/t/:slug/customers" element={<CustomersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Areeb")).toBeTruthy();
    expect(screen.getByText("+923001234567")).toBeTruthy();
    expect(screen.getByText("Memon Goth")).toBeTruthy();
  });
});
