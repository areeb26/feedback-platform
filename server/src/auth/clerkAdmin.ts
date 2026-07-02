export type ClerkAdminClient = {
  createOrganization(input: {
    name: string;
    createdBy: string;
  }): Promise<{ id: string }>;
  deleteOrganization(organizationId: string): Promise<void>;
  provisionTenantAdmin(input: {
    organizationId: string;
    emailAddress: string;
    password: string;
  }): Promise<void>;
};
