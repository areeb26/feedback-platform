import { describe, expect, it } from "vitest";
import {
  incidentContextLabel,
  reviewStatusLabel,
  statusLabel,
} from "../src/lib/labels";

describe("mobile api helpers", () => {
  it("maps incident status labels", () => {
    expect(statusLabel("created")).toBe("Created");
    expect(statusLabel("reviewed")).toBe("Reviewed");
    expect(statusLabel("resolved")).toBe("Resolved");
  });

  it("maps review status labels", () => {
    expect(reviewStatusLabel("not_replied")).toBe("Not Replied");
    expect(reviewStatusLabel("replied")).toBe("Replied");
    expect(reviewStatusLabel("reply_not_supported")).toBe(
      "Reply Not Supported",
    );
  });

  it("formats incident channel and issue labels", () => {
    expect(
      incidentContextLabel({
        channel: "delivery",
        issueCategory: "packaging",
      }),
    ).toBe("Delivery · Packaging");
  });
});
