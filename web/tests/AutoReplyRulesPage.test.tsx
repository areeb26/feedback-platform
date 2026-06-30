import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";
import { AutoReplyRulesPage } from "../src/pages/tenant/AutoReplyRulesPage";

const enabledShell: TenantShell = {
  slug: "hafiz-sweets",
  name: "Hafiz Sweets",
  logoUrl: null,
  primaryColor: "#7c3aed",
  featureFlags: {
    socialListening: false,
    competitorAnalytics: false,
    aiReplies: true,
    googleReviews: false,
  },
};

const disabledShell: TenantShell = {
  ...enabledShell,
  featureFlags: {
    ...enabledShell.featureFlags,
    aiReplies: false,
  },
};

const rulesFixture = [
  {
    id: "rule_1",
    name: "Low rating",
    maxRating: 2,
    templateText: "Sorry {reviewerName}",
    enabled: true,
  },
];

function ShellLayout({ shell }: { shell: TenantShell }) {
  return <Outlet context={{ shell }} />;
}

describe("AutoReplyRulesPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("redirects when aiReplies feature is disabled", async () => {
    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/auto-reply-rules"]}>
        <Routes>
          <Route path="/t/:slug" element={<ShellLayout shell={disabledShell} />}>
            <Route path="auto-reply-rules" element={<AutoReplyRulesPage />} />
            <Route path="overview" element={<div>Overview page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Overview page")).toBeTruthy();
  });

  it("lists rules and creates a new rule", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/auto-reply-rules") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "rule_2",
            name: "New rule",
            maxRating: 3,
            templateText: "Thanks {reviewerName}",
            enabled: true,
          }),
        });
      }
      if (url.includes("/auto-reply-rules")) {
        return Promise.resolve({
          ok: true,
          json: async () => rulesFixture,
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/auto-reply-rules"]}>
        <Routes>
          <Route path="/t/:slug" element={<ShellLayout shell={enabledShell} />}>
            <Route path="auto-reply-rules" element={<AutoReplyRulesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Low rating")).toBeTruthy();

    await user.type(screen.getByPlaceholderText("Rule name (optional)"), "New rule");
    await user.click(screen.getByRole("button", { name: "Create rule" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/auto-reply-rules",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
