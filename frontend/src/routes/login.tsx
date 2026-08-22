import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isAuthenticated, waitForAuth } from "@/lib/auth-storage";
import { isFirebaseConfigured } from "@/lib/firebase";
import { TiaLogo } from "@/components/TiaLogo";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    await waitForAuth();
    if (isAuthenticated()) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in | TIA" },
      { name: "description", content: "Sign in to the TIA finance automation platform." },
    ],
  }),
  component: LoginPage,
});

// Brute-force deterrent: after every 3 failed password attempts the form locks
// with an escalating cooldown (30s, 60s, 120s… capped at 5 min), persisted in
// localStorage so a refresh doesn't reset it. This is a UX-level speed bump —
// Firebase additionally rate-limits repeated failures server-side.
const GUARD_KEY = "tia_login_guard";
const MAX_TRIES = 3;

interface LoginGuard {
  failCount: number;
  lockedUntil: number;
}

function readGuard(): LoginGuard {
  try {
    const raw = localStorage.getItem(GUARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoginGuard;
      if (typeof parsed.failCount === "number" && typeof parsed.lockedUntil === "number") {
        return parsed;
      }
    }
  } catch {
    // fall through to a clean guard
  }
  return { failCount: 0, lockedUntil: 0 };
}

function isCredentialError(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  return (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  );
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/invalid-api-key":
      return "Firebase is not configured. Add VITE_FIREBASE_* values to frontend/.env.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guard, setGuard] = useState<LoginGuard>(readGuard);
  const [now, setNow] = useState(() => Date.now());

  const lockSecondsLeft = Math.max(0, Math.ceil((guard.lockedUntil - now) / 1000));
  const isLocked = lockSecondsLeft > 0;
  const triesLeft = MAX_TRIES - (guard.failCount % MAX_TRIES);

  useEffect(() => {
    if (!isLocked) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  function updateGuard(next: LoginGuard) {
    setGuard(next);
    localStorage.setItem(GUARD_KEY, JSON.stringify(next));
  }

  function recordFailure() {
    const failCount = guard.failCount + 1;
    let lockedUntil = guard.lockedUntil;
    if (failCount % MAX_TRIES === 0) {
      const lockoutNumber = failCount / MAX_TRIES;
      const seconds = Math.min(30 * 2 ** (lockoutNumber - 1), 300);
      lockedUntil = Date.now() + seconds * 1000;
      setNow(Date.now());
    }
    updateGuard({ failCount, lockedUntil });
  }

  function clearFailures() {
    setGuard({ failCount: 0, lockedUntil: 0 });
    localStorage.removeItem(GUARD_KEY);
  }

  async function run(action: () => Promise<void>, countFailures = false) {
    if (countFailures && isLocked) return;
    setError(null);
    setBusy(true);
    try {
      await action();
      clearFailures();
      navigate({ to: "/app" });
    } catch (err) {
      if (countFailures && isCredentialError(err)) recordFailure();
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run(
      () => (mode === "signin" ? loginWithEmail(email, password) : signupWithEmail(email, password)),
      mode === "signin"
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="flex h-14 items-center justify-between border-b border-[#D4E8EF] px-8">
        <TiaLogo size="sm" />
        <span className="rounded-full bg-[#F5F9FB] px-2.5 py-0.5 text-[11px] text-[#5A8A99]">
          Secure sign-in
        </span>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1
            className="text-center text-2xl font-semibold text-foreground"
            style={{ letterSpacing: "-0.5px" }}
          >
            {mode === "signin" ? "Sign in to TIA" : "Create your account"}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {mode === "signin"
              ? "Finance team and client portal access."
              : "Your workspace access is granted by an administrator after sign-up."}
          </p>

          {!isFirebaseConfigured && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              Firebase isn't configured yet. Copy <code>frontend/.env.example</code> to{" "}
              <code>frontend/.env</code> and fill in your Firebase web app keys, then restart
              the dev server.
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#D4E8EF] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#0D6E8A] focus:outline-none"
            />
            <input
              type="password"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#D4E8EF] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#0D6E8A] focus:outline-none"
            />

            {isLocked && mode === "signin" ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                <p className="text-xs leading-relaxed text-red-700">
                  Too many failed attempts. Sign-in is locked for{" "}
                  <span className="font-semibold tabular-nums">{lockSecondsLeft}s</span>.
                </p>
              </div>
            ) : (
              <>
                {error && <p className="text-xs text-red-600">{error}</p>}
                {mode === "signin" && guard.failCount > 0 && (
                  <p className="text-xs text-amber-600">
                    {triesLeft} attempt{triesLeft === 1 ? "" : "s"} left before a temporary lock.
                  </p>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={busy || (isLocked && mode === "signin")}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D6E8A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0A5A72] disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isLocked && mode === "signin"
                ? `Locked — ${lockSecondsLeft}s`
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D4E8EF]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5A8A99]">or</span>
            <div className="h-px flex-1 bg-[#D4E8EF]" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => run(loginWithGoogle)}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#D4E8EF] bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-[#0D6E8A] hover:bg-[#F5F9FB] disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New to TIA?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      <footer className="border-t border-[#D4E8EF] px-8 py-4">
        <p className="text-center text-[11px] text-[#5A8A99]">
          TIA · Built for TASC Outsourcing · Secured with Firebase Authentication
        </p>
      </footer>
    </div>
  );
}
