import { createContext, useContext } from "react";
import { DEMO_CLIENT_ID } from "@/lib/api";
import type { Role } from "@/lib/auth-storage";

export interface AuthState {
  isAuthenticated: boolean;
  /** True until Firebase restores the persisted session on first load. */
  loading: boolean;
  email: string | null;
  role: Role | null;
  clientId: number | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/**
 * Client id for portal API calls: the client_id custom claim of the signed-in
 * user, falling back to the demo client for local dev with AUTH_ENABLED=false.
 */
export function useClientId(): number {
  const { clientId } = useAuth();
  return clientId ?? DEMO_CLIENT_ID;
}
