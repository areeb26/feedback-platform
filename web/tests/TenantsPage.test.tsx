import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TenantsPage } from "../src/pages/admin/TenantsPage";

const defaultFeatureFlags = {
  socialListening: false,
  competitorAnalytics: false,
  aiReplies: false,
  googleReviews: false,
};

describe("TenantsPage", () => {
  it("shows tenant list from api", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            slug: "hafiz-sweets",
            name: "Hafiz Sweets",
            status: "active",
            primaryColor: "#7c3aed",
            logoUrl: null,
            featureFlags: defaultFeatureFlags,
            usage: { surveys: 2, submissions: 11, users: 3 },
          },
        ],
      }),
    );

    render(
      <MemoryRouter>
        <TenantsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Hafiz Sweets")).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
  });
});
