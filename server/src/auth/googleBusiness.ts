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

type GoogleBusinessClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleApiAccount = {
  name?: string;
};

type GoogleApiLocation = {
  name?: string;
  title?: string;
};

type GoogleApiReview = {
  name?: string;
  reviewId?: string;
  reviewer?: {
    displayName?: string;
  };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

const googleBusinessScope = "https://www.googleapis.com/auth/business.manage";

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
    async postReply() {
      throw new Error("Google Business client not configured");
    },
    async getSummary() {
      throw new Error("Google Business client not configured");
    },
  };
}

export function createDefaultGoogleBusinessClient(
  config: GoogleBusinessClientConfig,
): GoogleBusinessClient {
  return {
    buildAuthUrl({ redirectUri, state }) {
      assertRedirectUri(config, redirectUri);
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", googleBusinessScope);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);
      return authUrl.toString();
    },

    async exchangeCode({ code, redirectUri }) {
      assertRedirectUri(config, redirectUri);
      const token = await exchangeToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        grantType: "authorization_code",
        fields: {
          code,
          redirect_uri: redirectUri,
        },
      });

      if (!token.refresh_token) {
        throw new Error("Google did not return a refresh token");
      }

      const accessToken = requireString(token.access_token, "access_token");
      return {
        accessToken,
        refreshToken: token.refresh_token,
        expiresAt: expiresAtFromToken(token),
        accountId: await fetchFirstAccountId(accessToken),
      };
    },

    async refreshAccessToken(refreshToken) {
      const token = await exchangeToken({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        grantType: "refresh_token",
        fields: {
          refresh_token: refreshToken,
        },
      });
      return {
        accessToken: requireString(token.access_token, "access_token"),
        expiresAt: expiresAtFromToken(token),
      };
    },

    async listReviews({ accessToken, accountId }) {
      return listAllGoogleReviews(accessToken, accountId);
    },

    async postReply({ accessToken, reviewExternalId, replyText }) {
      await fetchJson(
        `https://mybusiness.googleapis.com/v4/${reviewExternalId}/reply`,
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
      const reviews = await listAllGoogleReviews(accessToken, accountId);
      const reviewCount = reviews.length;
      const averageRating =
        reviewCount === 0
          ? 0
          : reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount;
      return { reviewCount, averageRating };
    },
  };
}

function assertRedirectUri(
  config: GoogleBusinessClientConfig,
  redirectUri: string,
) {
  if (redirectUri !== config.redirectUri) {
    throw new Error("Invalid Google OAuth redirect URI");
  }
}

async function exchangeToken(input: {
  clientId: string;
  clientSecret: string;
  grantType: "authorization_code" | "refresh_token";
  fields: Record<string, string>;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: input.grantType,
    ...input.fields,
  });

  return fetchJson<GoogleTokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

function expiresAtFromToken(token: GoogleTokenResponse) {
  const expiresIn = token.expires_in ?? 3600;
  return new Date(Date.now() + expiresIn * 1000);
}

async function fetchFirstAccountId(accessToken: string) {
  const response = await fetchJson<{ accounts?: GoogleApiAccount[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const accountId = response.accounts?.find((account) => account.name)?.name;
  if (!accountId) {
    throw new Error("No Google Business Profile account found");
  }
  return accountId;
}

async function listAllGoogleReviews(
  accessToken: string,
  accountId: string,
): Promise<GoogleReviewPayload[]> {
  const locations = await listLocations(accessToken, accountId);
  const reviews = await Promise.all(
    locations.map((location) =>
      listLocationReviews(accessToken, accountId, location),
    ),
  );
  return reviews.flat();
}

async function listLocations(accessToken: string, accountId: string) {
  const locations: GoogleApiLocation[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
    );
    url.searchParams.set("readMask", "name,title");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetchJson<{
      locations?: GoogleApiLocation[];
      nextPageToken?: string;
    }>(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    locations.push(
      ...(response.locations ?? []).filter((location) => location.name),
    );
    pageToken = response.nextPageToken;
  } while (pageToken);

  return locations;
}

async function listLocationReviews(
  accessToken: string,
  accountId: string,
  location: GoogleApiLocation,
): Promise<GoogleReviewPayload[]> {
  const locationName = requireString(location.name, "location.name");
  const reviews: GoogleReviewPayload[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/${accountId}/${locationName}/reviews`,
    );
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetchJson<{
      reviews?: GoogleApiReview[];
      nextPageToken?: string;
    }>(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    for (const review of response.reviews ?? []) {
      reviews.push(toGoogleReviewPayload(review, accountId, location));
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return reviews;
}

function toGoogleReviewPayload(
  review: GoogleApiReview,
  accountId: string,
  location: GoogleApiLocation,
): GoogleReviewPayload {
  const locationName = requireString(location.name, "location.name");
  const reviewName =
    review.name ??
    `${accountId}/${locationName}/reviews/${requireString(
      review.reviewId,
      "reviewId",
    )}`;

  return {
    externalId: reviewName,
    reviewerName: review.reviewer?.displayName ?? "Google user",
    rating: ratingToNumber(review.starRating),
    content: review.comment ?? "",
    locationName: location.title ?? locationName,
    postedAt: new Date(
      review.updateTime ?? review.createTime ?? new Date().toISOString(),
    ),
  };
}

function ratingToNumber(starRating: string | undefined) {
  switch (starRating) {
    case "FIVE":
      return 5;
    case "FOUR":
      return 4;
    case "THREE":
      return 3;
    case "TWO":
      return 2;
    case "ONE":
      return 1;
    default:
      return 1;
  }
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as
    | (T & { error?: unknown; error_description?: unknown })
    | Record<string, never>;

  if (!response.ok) {
    const message =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : `Google API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Google API response missing ${field}`);
  }
  return value;
}
