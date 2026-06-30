export type AuthContext = {
  userId: string;
  orgId: string | null;
};

export type TenantFeatureFlags = {
  socialListening: boolean;
  competitorAnalytics: boolean;
  aiReplies: boolean;
  googleReviews: boolean;
};

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
    tenant?: {
      id: string;
      slug: string;
      name: string;
      logoUrl: string | null;
      primaryColor: string;
      featureFlags: TenantFeatureFlags;
    };
  }
}
