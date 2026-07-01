import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "../src/pages/HomePage";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderHome() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/t/:slug/overview"
          element={<div>Tenant overview loaded</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("shows entry hub with subtle system status when health check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", version: "1.0.0" }),
      }),
    );

    renderHome();

    expect(
      await screen.findByRole("heading", {
        name: /reputation that feels cared for/i,
      }),
    ).toBeTruthy();
    expect(await screen.findByText(/system online · v1\.0\.0/i)).toBeTruthy();
    expect(screen.queryByText("API: ok")).toBeNull();
  });

  it("navigates to tenant overview when slug is submitted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", version: "1.0.0" }),
      }),
    );

    const user = userEvent.setup();
    renderHome();

    await screen.findByText(/system online/i);
    await user.type(
      screen.getByLabelText(/tenant slug/i),
      "Hafiz Sweets",
    );
    await user.click(
      screen.getByRole("button", { name: /open tenant dashboard/i }),
    );

    expect(await screen.findByText("Tenant overview loaded")).toBeTruthy();
  });
});
