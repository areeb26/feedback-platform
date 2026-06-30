import type { Request, Response } from "express";
import { listingSchema, listingSyncResponseSchema } from "@feedback-platform/shared";
import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { listTenantListings, syncGoogleListings } from "../services/listings.js";

function toListingResponse(
  listing: {
    _id: { toString(): string };
    directory: "google" | "foodpanda";
    name: string;
    rating: number;
    reviewCount: number;
    locationId?: { toString(): string } | null;
  },
  locationName: string | null,
) {
  return listingSchema.parse({
    id: listing._id.toString(),
    directory: listing.directory,
    name: listing.name,
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    locationId: listing.locationId?.toString() ?? null,
    locationName,
  });
}

export function createListingRoutes(googleClient: GoogleBusinessClient) {
  return {
    async list(req: Request, res: Response) {
      const rows = await listTenantListings(req.tenant!.id);
      res.json(rows.map(({ listing, locationName }) => toListingResponse(listing, locationName)));
    },

    async sync(req: Request, res: Response) {
      try {
        const result = await syncGoogleListings({
          tenantId: req.tenant!.id,
          client: googleClient,
        });
        res.json(listingSyncResponseSchema.parse(result));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Listing sync failed";
        res.status(502).json({ error: message });
      }
    },
  };
}
