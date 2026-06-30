const oauthStates = new Map<string, { tenantId: string; expiresAt: number }>();

export function createOAuthState(tenantId: string) {
  const state = `${tenantId}:${crypto.randomUUID()}`;
  oauthStates.set(state, {
    tenantId,
    expiresAt: Date.now() + 10 * 60_000,
  });
  return state;
}

export function consumeOAuthState(state: string, tenantId: string) {
  const entry = oauthStates.get(state);
  oauthStates.delete(state);

  if (!entry || entry.tenantId !== tenantId) {
    return false;
  }

  if (entry.expiresAt < Date.now()) {
    return false;
  }

  return true;
}

export function clearOAuthStates() {
  oauthStates.clear();
}
