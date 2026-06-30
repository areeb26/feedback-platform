import { z } from "zod";

export const listingDirectorySchema = z.enum(["google", "foodpanda"]);

export const listingSchema = z.object({
  id: z.string(),
  directory: listingDirectorySchema,
  name: z.string(),
  rating: z.number(),
  reviewCount: z.number().int().nonnegative(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
});

export type Listing = z.infer<typeof listingSchema>;

export const listingSyncResponseSchema = z.object({
  synced: z.number().int().nonnegative(),
});

export type ListingSyncResponse = z.infer<typeof listingSyncResponseSchema>;
