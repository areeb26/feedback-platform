import { z } from "zod";

export const tenantProfileSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export type TenantProfile = z.infer<typeof tenantProfileSchema>;
