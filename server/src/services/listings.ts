import type { GoogleBusinessClient } from "../auth/googleBusiness.js";
import { Location } from "../models/location.js";
import { Listing } from "../models/listing.js";
import { ensureAccessToken, getGoogleConnection } from "./googleReviews.js";

export async function syncGoogleListings(input: {
  tenantId: string;
  client: GoogleBusinessClient;
}) {
  const connection = await getGoogleConnection(input.tenantId);
  if (!connection) {
    throw new Error("Google account not connected");
  }

  const accessToken = await ensureAccessToken(connection, input.client);
  const listings = await input.client.listListings({
    accessToken,
    accountId: connection.accountId,
  });

  let synced = 0;

  for (const listing of listings) {
    let locationId;
    if (listing.locationName) {
      const location = await Location.findOne({
        tenantId: input.tenantId,
        name: listing.locationName,
      });
      locationId = location?._id;
    }

    await Listing.findOneAndUpdate(
      {
        tenantId: input.tenantId,
        directory: "google",
        externalId: listing.externalId,
      },
      {
        name: listing.name,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        locationId,
      },
      { upsert: true },
    );
    synced += 1;
  }

  return { synced };
}

export async function listTenantListings(tenantId: string) {
  const listings = await Listing.find({ tenantId }).sort({ name: 1 });
  return Promise.all(
    listings.map(async (listing) => {
      const location = listing.locationId
        ? await Location.findById(listing.locationId)
        : null;
      return {
        listing,
        locationName: location?.name ?? null,
      };
    }),
  );
}
