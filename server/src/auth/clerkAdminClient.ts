import { createClerkClient } from "@clerk/backend";
import type { ClerkAdminClient } from "./clerkAdmin.js";

export function createDefaultClerkAdminClient(): ClerkAdminClient {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required");
  }

  const clerk = createClerkClient({ secretKey });

  return {
    async createOrganization({ name, createdBy }) {
      const organization = await clerk.organizations.createOrganization({
        name,
        createdBy,
      });
      return { id: organization.id };
    },
    async inviteAdmin({ organizationId, emailAddress }) {
      await clerk.organizations.createOrganizationInvitation({
        organizationId,
        emailAddress,
        role: "org:admin",
      });
    },
  };
}
