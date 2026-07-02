import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CreateTenantPage } from "../src/pages/admin/CreateTenantPage";

describe("CreateTenantPage", () => {
  it("creates tenant and shows client handover details", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        slug: "hafiz-sweets",
        name: "Hafiz Sweets",
        status: "active",
        primaryColor: "#7c3aed",
        logoUrl: null,
        featureFlags: {
          socialListening: false,
          competitorAnalytics: false,
          aiReplies: false,
          googleReviews: false,
        },
        usage: { surveys: 0, submissions: 0, users: 0 },
        clientEntryPath: "/t/hafiz-sweets",
        adminEmail: "admin@hafiz.com",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <CreateTenantPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/business name/i), "Hafiz Sweets");
    await user.type(screen.getByLabelText(/slug/i), "hafiz-sweets");
    await user.type(screen.getByLabelText(/client login email/i), "admin@hafiz.com");
    await user.type(screen.getByLabelText(/client password/i), "client-pass-123");
    await user.click(screen.getByRole("button", { name: /create client workspace/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/tenants",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Hafiz Sweets",
          slug: "hafiz-sweets",
          primaryColor: "#7c3aed",
          adminEmail: "admin@hafiz.com",
          adminPassword: "client-pass-123",
        }),
      }),
    );
    expect(await screen.findByText(/client workspace ready/i)).toBeTruthy();
    expect(screen.getByText("admin@hafiz.com")).toBeTruthy();
    expect(screen.getByText("client-pass-123")).toBeTruthy();
    expect(screen.getByText(/\/t\/hafiz-sweets/)).toBeTruthy();
  });
});
