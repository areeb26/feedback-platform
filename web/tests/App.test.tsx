import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

describe("App", () => {
  it("shows api status when health check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", version: "1.0.0" }),
      }),
    );

    render(<App />);

    expect(await screen.findByText("API: ok")).toBeTruthy();
  });
});
