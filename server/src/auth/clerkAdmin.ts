export type ClerkAdminClient = {
  createOrganization(input: {
    name: string;
    createdBy: string;
  }): Promise<{ id: string }>;
  inviteAdmin(input: {
    organizationId: string;
    emailAddress: string;
  }): Promise<void>;
};
