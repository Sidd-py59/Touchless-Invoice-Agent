import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isAuthenticated, refreshClaims, selectedRole, waitForAuth } from "@/lib/auth-storage";
import { TiaLogo } from "@/components/TiaLogo";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    await waitForAuth();
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const role = selectedRole();
    if (role === "admin") {
      throw redirect({ to: "/admin/dashboard" });
    }
    if (role === "client") {
      throw redirect({ to: "/client/dashboard" });
    }
    // No role claim yet — render the pending-access screen below.
  },
  head: () => ({
    meta: [
      { title: "Awaiting access | TIA" },
      { name: "description", content: "AI-powered payroll-to-invoice automation for TASC Finance Operations." },
    ],
  }),
  component: PendingAccess,
});

function PendingAccess() {
  const navigate = useNavigate();
  const { email, logout } = useAuth();

  async function checkAgain() {
    // Picks up custom claims granted since sign-in without a full re-login.
    await refreshClaims();
    await waitForAuth();
    const role = selectedRole();
    if (role === "admin") navigate({ to: "/admin/dashboard" });
    else if (role === "client") navigate({ to: "/client/dashboard" });
  }

  async function handleLogout() {
    await logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <nav className="flex h-14 items-center justify-between border-b border-[#E2E8F0] px-8">
        <TiaLogo size="sm" />
        <span className="rounded-full bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] text-[#64748B]">
          {email}
        </span>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8FAFC]">
          <ShieldAlert className="h-5 w-5 text-[#00020A]" />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-foreground" style={{ letterSpacing: "-0.5px" }}>
          Your account is awaiting access
        </h1>
        <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          You're signed in as <span className="font-medium text-foreground">{email}</span>, but an
          administrator hasn't assigned your workspace role yet. Ask your TIA administrator to grant
          you finance-team or client-portal access.
        </p>
        <div className="mt-8 flex gap-2">
          <button
            onClick={checkAgain}
            className="rounded-lg bg-[#00020A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00020A]"
          >
            Check again
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-foreground transition hover:bg-[#F8FAFC]"
          >
            Sign out
          </button>
        </div>
      </div>

      <footer className="border-t border-[#E2E8F0] px-8 py-4">
        <p className="text-center text-[11px] text-[#64748B]">
          TIA · Built for TASC Outsourcing · Secured with Firebase Authentication
        </p>
      </footer>
    </div>
  );
}
