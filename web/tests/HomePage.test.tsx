import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "../src/pages/HomePage";
import { clerkAuthState, resetClerkMock } from "./clerkMock";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetClerkMock();
});

function mockHomeFetch(handlers: {
  health?: boolean;
  adminTenants?: boolean;
  tenantMe?: { ok: boolean; body?: unknown };
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/health")) {
        return {
          ok: handlers.health ?? true,
          json: async () => ({ status: "ok", version: "1.0.0" }),
        };
      }
      if (url.includes("/api/admin/tenants")) {
        const ok = handlers.adminTenants ?? false;
        return {
          ok,
          status: ok ? 200 : 403,
          json: async () => (ok ? [] : { error: "Forbidden" }),
        };
      }
      if (url.endsWith("/api/tenant/me")) {
        const tenantMe = handlers.tenantMe ?? { ok: false };
        return {
          ok: tenantMe.ok,
          status: tenantMe.ok ? 200 : 403,
          json: async () =>
            tenantMe.body ?? { error: tenantMe.ok ? undefined : "Forbidden" },
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin/tenants" element={<div>Admin tenants loaded</div>} />
        <Route
          path="/t/:slug/overview"
          element={<div>Tenant overview loaded</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("shows agency landing without a tenant slug form", async () => {
    mockHomeFetch({});
    renderHome();

    expect(
      await screen.findByRole("heading", {
        name: /reputation that feels cared for/i,
      }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/tenant slug/i)).toBeNull();
    expect(screen.getByRole("link", { name: /super-admin panel/i })).toBeTruthy();
  });

  it("shows subtle system status when health check succeeds", async () => {
    mockHomeFetch({});
    renderHome();

    expect(await screen.findByText(/system online · v1\.0\.0/i)).toBeTruthy();
  });

  it("redirects a signed-in tenant user to their overview", async () => {
    clerkAuthState.isSignedIn = true;
    mockHomeFetch({
      tenantMe: {
        ok: true,
        body: { slug: "hafiz-sweets", name: "Hafiz Sweets" },
      },
    });

    renderHome();

    expect(await screen.findByText("Tenant overview loaded")).toBeTruthy();
  });

  it("redirects a signed-in super-admin to the admin panel", async () => {
    clerkAuthState.isSignedIn = true;
    mockHomeFetch({
      adminTenants: true,
    });

    renderHome();

    expect(await screen.findByText("Admin tenants loaded")).toBeTruthy();
  });
});
