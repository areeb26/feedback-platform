import { describe, expect, it } from "vitest";
import { createTenantClient } from "../src/api/tenantClient";

describe("createTenantClient", () => {
  it("exposes tenant-scoped API groups", () => {
    const client = createTenantClient("hafiz-sweets");

    expect(client.shell).toBeTypeOf("function");
    expect(client.incidents.list).toBeTypeOf("function");
    expect(client.surveys.create).toBeTypeOf("function");
    expect(client.reviews.import).toBeTypeOf("function");
    expect(client.overview.get).toBeTypeOf("function");
  });
});
