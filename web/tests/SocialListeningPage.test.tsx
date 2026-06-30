import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";
import { SocialListeningPage } from "../src/pages/tenant/SocialListeningPage";

const enabledShell: TenantShell = {
  slug: "hafiz-sweets",
  name: "Hafiz Sweets",
  logoUrl: null,
  primaryColor: "#7c3aed",
  featureFlags: {
    socialListening: true,
    competitorAnalytics: false,
    aiReplies: false,
    googleReviews: false,
  },
};

const disabledShell: TenantShell = {
  ...enabledShell,
  featureFlags: {
    ...enabledShell.featureFlags,
    socialListening: false,
  },
};

function renderPage(shell: TenantShell) {
  return render(
    <MemoryRouter initialEntries={["/t/hafiz-sweets/social-listening"]}>
      <Routes>
        <Route path="/t/:slug" element={<Outlet context={{ shell }} />}>
          <Route path="social-listening" element={<SocialListeningPage />} />
          <Route path="overview" element={<div>Overview Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("SocialListeningPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders empty state and about banner", () => {
    renderPage(enabledShell);

    expect(screen.getByRole("heading", { name: "Social Listening" })).toBeTruthy();
    expect(screen.getByText("About this data")).toBeTruthy();
    expect(
      screen.getByText("No mentions found, contact support to get setup"),
    ).toBeTruthy();
    expect(screen.getByText("Select a mention to view details")).toBeTruthy();
  });

  it("dismisses the about banner", async () => {
    renderPage(enabledShell);

    expect(screen.getByText("About this data")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss banner" }));

    expect(screen.queryByText("About this data")).toBeNull();
    expect(localStorage.getItem("social-listening-about-banner-dismissed")).toBe(
      "true",
    );
  });

  it("shows refresh message when no data source is configured", async () => {
    renderPage(enabledShell);

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(screen.getByText("No data source configured")).toBeTruthy();
  });

  it("redirects to overview when feature flag is disabled", async () => {
    renderPage(disabledShell);

    expect(await screen.findByText("Overview Page")).toBeTruthy();
    expect(screen.queryByText("Social Listening")).toBeNull();
  });
});
