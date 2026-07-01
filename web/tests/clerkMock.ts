import { createElement } from "react";
import { vi } from "vitest";

export const clerkAuthState = {
  isLoaded: true,
  isSignedIn: false,
  orgId: null as string | null,
};

export const clerkOrgState = {
  isLoaded: true,
  setActive: vi.fn(async () => undefined),
  userMemberships: {
    data: [] as Array<{ organization: { id: string } }>,
  },
};

export function resetClerkMock() {
  clerkAuthState.isLoaded = true;
  clerkAuthState.isSignedIn = false;
  clerkAuthState.orgId = null;
  clerkOrgState.isLoaded = true;
  clerkOrgState.setActive = vi.fn(async () => undefined);
  clerkOrgState.userMemberships.data = [];
}

vi.mock("@clerk/react", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  Show: ({ children }: { children: React.ReactNode }) => children,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => null,
  OrganizationSwitcher: () =>
    createElement("div", null, "Organization switcher"),
  useAuth: () => ({
    isLoaded: clerkAuthState.isLoaded,
    isSignedIn: clerkAuthState.isSignedIn,
    orgId: clerkAuthState.orgId,
    getToken: async () => (clerkAuthState.isSignedIn ? "test-token" : null),
  }),
  useOrganizationList: () => clerkOrgState,
}));
