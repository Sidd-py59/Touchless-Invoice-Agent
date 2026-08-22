import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { isAuthenticated, selectedRole, waitForAuth } from "@/lib/auth-storage";

export const Route = createFileRoute("/client")({
  beforeLoad: async ({ location }) => {
    await waitForAuth();
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }

    const role = selectedRole();
    if (role !== "client") {
      // Admins go to the back office; role-less users to the pending screen.
      throw redirect({ to: role === "admin" ? "/admin/dashboard" : "/app" });
    }

    if (location.pathname === "/client") {
      throw redirect({ to: "/client/dashboard" });
    }
  },
  component: ClientLayout,
});

function ClientLayout() {
  return <AppShell role="client" />;
}
