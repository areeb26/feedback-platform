import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import type { TenantShell } from "@feedback-platform/shared";
import { ReviewsPage } from "../src/pages/tenant/ReviewsPage";

const shell: TenantShell = {
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

function ShellLayout() {
  return <Outlet context={{ shell }} />;
}

const reviewsFixture = [
  {
    id: "rev_1",
    source: "google",
    reviewerName: "kashif shah",
    rating: 4,
    content: "Average",
    locationName: "Hafiz Sweets",
    listingName: "Hafiz Sweets",
    categories: [],
    status: "not_replied",
    replyText: null,
    postedAt: "2026-06-30T13:50:00.000Z",
    createdAt: "2026-06-30T13:50:00.000Z",
    canReply: true,
  },
  {
    id: "rev_2",
    source: "foodpanda",
    reviewerName: "Izhan",
    rating: 5,
    content: "Great food",
    locationName: "Hafiz Sweets - Saudabad",
    listingName: "Hafiz Sweets - Saudabad",
    categories: [],
    status: "reply_not_supported",
    replyText: null,
    postedAt: "2026-06-30T13:50:00.000Z",
    createdAt: "2026-06-30T13:50:00.000Z",
    canReply: false,
  },
];

describe("ReviewsPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows review cards with statuses and supports reply", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/google/status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "disconnected",
            accountId: null,
            reviewCount: 0,
            averageRating: 0,
            errorMessage: null,
            connectedAt: null,
          }),
        });
      }
      if (url.includes("/reviews/export")) {
        return Promise.resolve({ ok: true, text: async () => "csv" });
      }
      if (url.includes("/reviews/") && init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...reviewsFixture[0],
            status: "replied",
            replyText: "Thank you!",
            canReply: false,
          }),
        });
      }
      if (url.includes("/reviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => reviewsFixture,
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/reviews"]}>
        <Routes>
          <Route path="/t/:slug" element={<ShellLayout />}>
            <Route path="reviews" element={<ReviewsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("kashif shah")).toBeTruthy();
    expect(screen.getByText("Izhan")).toBeTruthy();
    expect(screen.getByText("Not Replied")).toBeTruthy();
    expect(screen.getAllByText("Reply Not Supported").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Select all unreplied" }));
    expect(screen.getByText("1 selected")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reply" }));
    await user.type(screen.getByPlaceholderText("Write your reply"), "Thank you!");
    await user.click(screen.getByRole("button", { name: "Submit reply" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/reviews/rev_1/reply",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("generates draft replies for selected unreplied reviews", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/google/status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "disconnected",
            accountId: null,
            reviewCount: 0,
            averageRating: 0,
            errorMessage: null,
            connectedAt: null,
          }),
        });
      }
      if (url.includes("/reviews/generate-replies") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            drafts: [
              {
                reviewId: "rev_1",
                draftReply: "Thanks for sharing your feedback!",
              },
            ],
          }),
        });
      }
      if (url.includes("/reviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => reviewsFixture,
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/t/hafiz-sweets/reviews"]}>
        <Routes>
          <Route path="/t/:slug" element={<ShellLayout />}>
            <Route path="reviews" element={<ReviewsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("kashif shah");
    await user.click(screen.getByRole("button", { name: "Select all unreplied" }));
    await user.click(screen.getByRole("button", { name: "Generate Replies" }));

    expect(await screen.findByText("Generated reply drafts")).toBeTruthy();
    expect(screen.getByDisplayValue("Thanks for sharing your feedback!")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tenant/by-slug/hafiz-sweets/reviews/generate-replies",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
