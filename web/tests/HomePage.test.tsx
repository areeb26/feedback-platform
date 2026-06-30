import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "../src/pages/HomePage";

describe("HomePage", () => {
  it("shows api status when health check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", version: "1.0.0" }),
      }),
    );

    render(<HomePage />);

    expect(await screen.findByText("API: ok")).toBeTruthy();
  });
});
