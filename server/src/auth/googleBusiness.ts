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
