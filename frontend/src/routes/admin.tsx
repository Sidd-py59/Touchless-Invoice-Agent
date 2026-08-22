import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { isAuthenticated, selectedRole, waitForAuth } from "@/lib/auth-storage";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    await waitForAuth();
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }

    const role = selectedRole();
    if (role !== "admin") {
      // Client users go to their portal; role-less users to the pending screen.
      throw redirect({ to: role === "client" ? "/client/dashboard" : "/app" });
    }

    if (location.pathname === "/admin") {
      throw redirect({ to: "/admin/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <AppShell role="admin" />;
}
