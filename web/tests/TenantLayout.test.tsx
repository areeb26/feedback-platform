import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TenantLayout } from "../src/layouts/TenantLayout";
import { SUPPORT_WHATSAPP_URL } from "../src/tenant/navigation";

describe("TenantLayout", () => {
  it("shows tenant branding and navigation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          slug: "hafiz-sweets",
          name: "Hafiz Sweets",
          logoUrl: null,
          primaryColor: "#7c3aed",
          featureFlags: {
            socialListening: false,
            competitorAnalytics: false,
            aiReplies: false,
            googleReviews: false,
          },
        }),
      }),
    );

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/overview"]}>
        <Routes>
          <Route path="/t/:slug/*" element={<TenantLayout />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Hafiz Sweets")).toBeTruthy();
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByText("Surveys")).toBeTruthy();
    const supportLink = screen.getByRole("link", { name: "Contact Support" });
    expect(supportLink.getAttribute("href")).toBe(SUPPORT_WHATSAPP_URL);
  });
});
