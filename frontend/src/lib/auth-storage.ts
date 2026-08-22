import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type Role = "admin" | "client";

export interface AuthSnapshot {
  user: User | null;
  role: Role | null;
  clientId: number | null;
  token: string | null;
}

// Module-level mirror of Firebase auth state so route guards (sync-ish
// beforeLoad) and URL builders can read it without a hook. Firebase refreshes
// ID tokens automatically; onIdTokenChanged keeps this cache current.
let snapshot: AuthSnapshot = { user: null, role: null, clientId: null, token: null };
let resolveReady: (() => void) | null = null;
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

const listeners = new Set<(snap: AuthSnapshot) => void>();

onIdTokenChanged(auth, async (user) => {
  if (user) {
    const result = await user.getIdTokenResult();
    const role = result.claims.role;
    const clientId = result.claims.client_id;
    snapshot = {
      user,
      role: role === "admin" || role === "client" ? role : null,
      clientId: typeof clientId === "number" ? clientId : null,
      token: result.token,
    };
  } else {
    snapshot = { user: null, role: null, clientId: null, token: null };
  }
  resolveReady?.();
  resolveReady = null;
  listeners.forEach((fn) => fn(snapshot));
});

/** Resolves once Firebase has restored (or rejected) the persisted session. */
export function waitForAuth(): Promise<void> {
  return ready;
}

export function subscribeAuth(fn: (snap: AuthSnapshot) => void): () => void {
  listeners.add(fn);
  fn(snapshot);
  return () => listeners.delete(fn);
}

export function getSnapshot(): AuthSnapshot {
  return snapshot;
}

export function isAuthenticated(): boolean {
  return snapshot.user !== null;
}

export function selectedRole(): Role | null {
  return snapshot.role;
}

export function currentClientId(): number | null {
  return snapshot.clientId;
}

/** Latest cached ID token — for download links that cannot carry headers. */
export function getCachedToken(): string | null {
  return snapshot.token;
}

/** Fresh ID token for API requests (Firebase refreshes it if near expiry). */
export async function getFreshToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Force-refresh the token so newly granted custom claims (set via the backend
 * set_user_claims.py script) are picked up without a full re-login.
 */
export async function refreshClaims(): Promise<void> {
  await auth.currentUser?.getIdToken(true);
}
