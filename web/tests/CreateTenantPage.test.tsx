import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CreateTenantPage } from "../src/pages/admin/CreateTenantPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CreateTenantPage", () => {
  it("creates tenant when form is submitted", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        slug: "hafiz-sweets",
        name: "Hafiz Sweets",
        status: "active",
        primaryColor: "#7c3aed",
        logoUrl: null,
        usage: { surveys: 0, submissions: 0, users: 0 },
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
    await user.type(screen.getByLabelText(/admin email/i), "admin@hafiz.com");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/tenants",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Hafiz Sweets",
          slug: "hafiz-sweets",
          primaryColor: "#7c3aed",
          adminEmail: "admin@hafiz.com",
        }),
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/admin/tenants");
  });
});
