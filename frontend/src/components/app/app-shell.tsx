import { Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { TiaLogo } from "@/components/TiaLogo";
import {
  LogOut,
  LayoutDashboard,
  FileStack,
  CheckSquare,
  FileText,
  Send,
  Users,
  BarChart3,
  Upload,
  History,
  Bot,
  Inbox,
  MessageSquare,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AppShellProps {
  role: "admin" | "client";
}

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/payroll-queue", label: "Payroll Queue", icon: FileStack },
  { to: "/admin/human-review", label: "Human Review", icon: CheckSquare },
  { to: "/admin/invoices", label: "Invoices", icon: FileText },
  { to: "/admin/agent", label: "Agent", icon: Bot },
  { to: "/admin/dispatch", label: "Dispatch", icon: Send },
  { to: "/admin/clients", label: "Clients", icon: Users },
  { to: "/admin/queries", label: "Queries", icon: Inbox },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

const clientLinks = [
  { to: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/client/upload-payroll", label: "Upload Payroll", icon: Upload },
  { to: "/client/invoices", label: "My Invoices", icon: FileText },
  { to: "/client/queries", label: "Support", icon: MessageSquare },
  { to: "/client/upload-history", label: "Upload History", icon: History },
];

export function AppShell({ role }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const links = role === "admin" ? adminLinks : clientLinks;
  const roleLabel = role === "admin" ? "Finance Ops" : "Client Portal";
  const userInitial = email ? email[0].toUpperCase() : "?";
  const activeLink = links.find(
    (l) =>
      location.pathname === l.to ||
      (l.to !== "/admin/dashboard" && l.to !== "/client/dashboard" && location.pathname.startsWith(l.to))
  );

  return (
    <SidebarProvider>
      <Sidebar variant="inset" className="bg-white/40 backdrop-blur-xl border-r border-white/30">
        {/* Brand */}
        <SidebarHeader className="border-b border-white/30 px-5 py-4 bg-transparent">
          <div>
            <TiaLogo size="sm" />
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {links.map((link) => {
                  const isActive =
                    location.pathname === link.to ||
                    (link.to !== "/admin/dashboard" &&
                      link.to !== "/client/dashboard" &&
                      location.pathname.startsWith(link.to));
                  return (
                    <SidebarMenuItem key={link.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={link.label}
                        className={
                          isActive
                            ? "neu-inset bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium rounded-lg"
                            : "text-sidebar-foreground/60 hover:neu-inset hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground rounded-lg transition-all"
                        }
                      >
                        <Link to={link.to}>
                          <link.icon className="h-4 w-4 shrink-0" />
                          <span className="text-sm">{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User footer */}
        <SidebarFooter className="border-t border-white/30 px-4 py-3 bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              {userInitial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{email ?? "user"}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-[#f0f6f8]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b border-white/30 bg-white/40 backdrop-blur-xl px-5">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <div className="h-4 w-px bg-border" />
          <p className="text-sm font-medium text-foreground">{activeLink?.label ?? "TIA"}</p>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
