export type GoogleListingPayload = {
  externalId: string;
  name: string;
  rating: number;
  reviewCount: number;
  locationName?: string;
};

export type GoogleReviewPayload = {
  externalId: string;
  reviewerName: string;
  rating: number;
  content: string;
  locationName: string;
  postedAt: Date;
};

export type GoogleTokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  accountId: string;
};

export type GoogleBusinessClient = {
  buildAuthUrl(input: { redirectUri: string; state: string }): string;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<GoogleTokenPayload>;
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
  }>;
  listReviews(input: {
    accessToken: string;
    accountId: string;
  }): Promise<GoogleReviewPayload[]>;
  listListings(input: {
    accessToken: string;
    accountId: string;
  }): Promise<GoogleListingPayload[]>;
  postReply(input: {
    accessToken: string;
    accountId: string;
    reviewExternalId: string;
    replyText: string;
  }): Promise<void>;
  getSummary(input: {
    accessToken: string;
    accountId: string;
  }): Promise<{ reviewCount: number; averageRating: number }>;
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ACCOUNT_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const GOOGLE_BUSINESS_INFO_URL =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
const GOOGLE_MY_BUSINESS_URL = "https://mybusiness.googleapis.com/v4";
const GOOGLE_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage";

type GoogleClientConfig = {
  clientId: string;
  clientSecret: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type GoogleAccountResponse = {
  accounts?: Array<{ name?: string }>;
};

type GoogleLocation = {
  name?: string;
  title?: string;
};

type GoogleLocationResponse = {
  locations?: GoogleLocation[];
  nextPageToken?: string;
};

type GoogleReview = {
  name?: string;
  reviewId?: string;
  reviewer?: { displayName?: string };
  starRating?: string | number;
  comment?: string;
  createTime?: string;
};

type GoogleReviewResponse = {
  reviews?: GoogleReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
};

async function fetchGoogleJson<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        payload.error_description ??
        `Google request failed with status ${response.status}`,
    );
  }

  return payload as T;
}

function tokenExpiresAt(expiresInSeconds?: number) {
  return new Date(Date.now() + (expiresInSeconds ?? 3600) * 1000);
}

function ratingFromGoogle(value: GoogleReview["starRating"]) {
  if (typeof value === "number") return value;
  const ratings: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return value ? ratings[value] ?? 0 : 0;
}

function reviewResourceName(accountId: string, reviewExternalId: string) {
  if (reviewExternalId.startsWith("accounts/")) return reviewExternalId;
  if (reviewExternalId.startsWith("locations/")) {
    return `${accountId}/${reviewExternalId}`;
  }
  return `${accountId}/locations/-/reviews/${reviewExternalId}`;
}

export function createDefaultGoogleBusinessClient(
  config: GoogleClientConfig,
): GoogleBusinessClient {
  async function listAccounts(accessToken: string) {
    const payload = await fetchGoogleJson<GoogleAccountResponse>(
      GOOGLE_ACCOUNT_URL,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return payload.accounts?.map((account) => account.name).filter(Boolean) ?? [];
  }

  async function listLocations(accessToken: string, accountId: string) {
    const locations: GoogleLocation[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ readMask: "name,title" });
      if (pageToken) params.set("pageToken", pageToken);

      const payload = await fetchGoogleJson<GoogleLocationResponse>(
        `${GOOGLE_BUSINESS_INFO_URL}/${accountId}/locations?${params}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      locations.push(...(payload.locations ?? []));
      pageToken = payload.nextPageToken;
    } while (pageToken);

    return locations.filter((location) => location.name);
  }

  async function listLocationReviews(input: {
    accessToken: string;
    accountId: string;
    location: GoogleLocation;
  }) {
    const reviews: GoogleReview[] = [];
    let averageRating = 0;
    let totalReviewCount = 0;
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ pageSize: "50" });
      if (pageToken) params.set("pageToken", pageToken);

      const payload = await fetchGoogleJson<GoogleReviewResponse>(
        `${GOOGLE_MY_BUSINESS_URL}/${input.accountId}/${input.location.name}/reviews?${params}`,
        {
          headers: { Authorization: `Bearer ${input.accessToken}` },
        },
      );
      reviews.push(...(payload.reviews ?? []));
      averageRating = payload.averageRating ?? averageRating;
      totalReviewCount = payload.totalReviewCount ?? totalReviewCount;
      pageToken = payload.nextPageToken;
    } while (pageToken);

    return { reviews, averageRating, totalReviewCount };
  }

  return {
    buildAuthUrl({ redirectUri, state }) {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GOOGLE_BUSINESS_SCOPE,
        access_type: "offline",
        prompt: "consent",
        state,
      });
      return `${GOOGLE_AUTH_URL}?${params}`;
    },

    async exchangeCode({ code, redirectUri }) {
      const payload = await fetchGoogleJson<GoogleTokenResponse>(
        GOOGLE_TOKEN_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          }),
        },
      );
      if (!payload.access_token || !payload.refresh_token) {
        throw new Error("Google OAuth did not return reusable tokens");
      }
      const [accountId] = await listAccounts(payload.access_token);
      if (!accountId) {
        throw new Error("Google account has no Business Profile accounts");
      }
      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: tokenExpiresAt(payload.expires_in),
        accountId,
      };
    },

    async refreshAccessToken(refreshToken) {
      const payload = await fetchGoogleJson<GoogleTokenResponse>(
        GOOGLE_TOKEN_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        },
      );
      if (!payload.access_token) {
        throw new Error("Google token refresh did not return an access token");
      }
      return {
        accessToken: payload.access_token,
        expiresAt: tokenExpiresAt(payload.expires_in),
      };
    },

    async listReviews({ accessToken, accountId }) {
      const locations = await listLocations(accessToken, accountId);
      const reviews: GoogleReviewPayload[] = [];

      for (const location of locations) {
        const locationName = location.title ?? location.name ?? "Google location";
        const payload = await listLocationReviews({
          accessToken,
          accountId,
          location,
        });
        for (const review of payload.reviews) {
          const externalId =
            review.name ??
            `${accountId}/${location.name}/reviews/${review.reviewId ?? ""}`;
          reviews.push({
            externalId,
            reviewerName: review.reviewer?.displayName ?? "Google reviewer",
            rating: ratingFromGoogle(review.starRating),
            content: review.comment ?? "",
            locationName,
            postedAt: review.createTime ? new Date(review.createTime) : new Date(),
          });
        }
      }

      return reviews;
    },

    async listListings({ accessToken, accountId }) {
      const locations = await listLocations(accessToken, accountId);
      const listings: GoogleListingPayload[] = [];

      for (const location of locations) {
        const payload = await listLocationReviews({
          accessToken,
          accountId,
          location,
        });
        listings.push({
          externalId: location.name!,
          name: location.title ?? location.name!,
          rating: payload.averageRating,
          reviewCount: payload.totalReviewCount,
          locationName: location.title,
        });
      }

      return listings;
    },

    async postReply({ accessToken, accountId, reviewExternalId, replyText }) {
      await fetchGoogleJson(
        `${GOOGLE_MY_BUSINESS_URL}/${reviewResourceName(
          accountId,
          reviewExternalId,
        )}/reply`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment: replyText }),
        },
      );
    },

    async getSummary({ accessToken, accountId }) {
      const locations = await listLocations(accessToken, accountId);
      let reviewCount = 0;
      let weightedRatingTotal = 0;

      for (const location of locations) {
        const payload = await listLocationReviews({
          accessToken,
          accountId,
          location,
        });
        reviewCount += payload.totalReviewCount;
        weightedRatingTotal += payload.averageRating * payload.totalReviewCount;
      }

      return {
        reviewCount,
        averageRating:
          reviewCount === 0
            ? 0
            : Math.round((weightedRatingTotal / reviewCount) * 100) / 100,
      };
    },
  };
}

export function createNoopGoogleBusinessClient(): GoogleBusinessClient {
  return {
    buildAuthUrl() {
      throw new Error("Google Business client not configured");
    },
    async exchangeCode() {
      throw new Error("Google Business client not configured");
    },
    async refreshAccessToken() {
      throw new Error("Google Business client not configured");
    },
    async listReviews() {
      throw new Error("Google Business client not configured");
    },
    async listListings() {
      throw new Error("Google Business client not configured");
    },
    async postReply() {
      throw new Error("Google Business client not configured");
    },
    async getSummary() {
      throw new Error("Google Business client not configured");
    },
  };
}
