export type GooglePlaceDetails = {
  rating: number;
  reviewCount: number;
  name: string;
};

export type GooglePlacesClient = {
  getPlaceDetails(placeId: string): Promise<GooglePlaceDetails>;
};

export function createNoopGooglePlacesClient(): GooglePlacesClient {
  return {
    async getPlaceDetails() {
      throw new Error("Google Places client not configured");
    },
  };
}

type PlacesApiResponse = {
  status: string;
  result?: {
    name?: string;
    rating?: number;
    user_ratings_total?: number;
  };
  error_message?: string;
};

export function createGooglePlacesClient(apiKey: string): GooglePlacesClient {
  return {
    async getPlaceDetails(placeId: string) {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/details/json",
      );
      url.searchParams.set("place_id", placeId);
      url.searchParams.set("fields", "name,rating,user_ratings_total");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Google Places request failed");
      }

      const data = (await response.json()) as PlacesApiResponse;
      if (data.status !== "OK" || !data.result) {
        throw new Error(data.error_message ?? "Google Places lookup failed");
      }

      return {
        name: data.result.name ?? "",
        rating: data.result.rating ?? 0,
        reviewCount: data.result.user_ratings_total ?? 0,
      };
    },
  };
}

export function resolveGooglePlacesClient(
  override?: GooglePlacesClient,
): GooglePlacesClient {
  if (override) {
    return override;
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    return createGooglePlacesClient(apiKey);
  }
  return createNoopGooglePlacesClient();
}
