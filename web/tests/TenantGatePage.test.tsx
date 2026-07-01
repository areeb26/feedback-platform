import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TenantGatePage } from "../src/pages/TenantGatePage";
import { clerkAuthState, resetClerkMock } from "./clerkMock";

type ResponseShape = { ok: boolean; status?: number; body?: unknown };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  resetClerkMock();
});

const activeBranding = {
  slug: "hafiz-sweets",
  name: "Hafiz Sweets",
  logoUrl: null,
  primaryColor: "#7c3aed",
  status: "active",
};

const shellPayload = {
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
};

function mockFetch(handlers: {
  branding?: ResponseShape;
  shell?: ResponseShape | ResponseShape[];
}) {
  let shellCalls = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/public/tenants/")) {
        const branding = handlers.branding ?? { ok: true, body: activeBranding };
        return {
          ok: branding.ok,
          status: branding.status ?? (branding.ok ? 200 : 404),
          json: async () => branding.body ?? {},
        };
      }
      if (url.includes("/shell")) {
        const shellHandler = handlers.shell ?? { ok: true, body: shellPayload };
        const responses = Array.isArray(shellHandler)
          ? shellHandler
          : [shellHandler];
        const shell = responses[shellCalls] ?? responses[responses.length - 1];
        shellCalls += 1;
        return {
          ok: shell.ok,
          status: shell.status ?? (shell.ok ? 200 : 403),
          json: async () => shell.body ?? {},
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
}

function renderGate(slug = "hafiz-sweets") {
  return render(
    <MemoryRouter initialEntries={[`/t/${slug}`]}>
      <Routes>
        <Route path="/t/:slug" element={<TenantGatePage />} />
        <Route
          path="/t/:slug/overview"
          element={<div>Tenant overview loaded</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TenantGatePage", () => {
  it("shows tenant branding and sign-in for an active tenant", async () => {
    mockFetch({});
    renderGate();

    expect(await screen.findByRole("heading", { name: "Hafiz Sweets" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("redirects a signed-in user with matching org to overview", async () => {
    clerkAuthState.isSignedIn = true;
    mockFetch({});

    renderGate();

    expect(await screen.findByText("Tenant overview loaded")).toBeTruthy();
  });

  it("shows wrong-workspace recovery when shell access is denied", async () => {
    clerkAuthState.isSignedIn = true;
    mockFetch({
      shell: { ok: false, status: 403, body: { error: "Forbidden" } },
    });

    renderGate();

    expect(await screen.findByText(/signed in to the wrong workspace/i)).toBeTruthy();
    expect(screen.getByText("Organization switcher")).toBeTruthy();
  });

  it("shows a pause message without sign-in for a suspended tenant", async () => {
    mockFetch({
      branding: {
        ok: true,
        body: { ...activeBranding, status: "suspended" },
      },
    });

    renderGate();

    expect(await screen.findByText(/workspace has been paused/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
  });

  it("shows not found when branding cannot be loaded", async () => {
    mockFetch({
      branding: { ok: false, status: 404, body: { error: "Tenant not found" } },
    });

    renderGate("unknown");

    expect(await screen.findByText(/workspace not found/i)).toBeTruthy();
  });
});
