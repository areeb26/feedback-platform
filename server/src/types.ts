export type AuthContext = {
  userId: string;
  orgId: string | null;
};

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
    tenant?: {
      id: string;
      slug: string;
      name: string;
    };
  }
}
