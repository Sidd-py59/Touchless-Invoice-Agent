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
  Bell,
  Settings,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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

/* ── Grouped admin navigation ─────────────── */

const adminGroups = [
  {
    label: "Workspace",
    links: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/payroll-queue", label: "Payroll Queue", icon: FileStack },
      { to: "/admin/human-review", label: "Human Review", icon: CheckSquare },
      { to: "/admin/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "Automation",
    links: [
      { to: "/admin/agent", label: "Agent", icon: Bot },
      { to: "/admin/dispatch", label: "Dispatch", icon: Send },
    ],
  },
  {
    label: "Insights",
    links: [
      { to: "/admin/clients", label: "Clients", icon: Users },
      { to: "/admin/queries", label: "Queries", icon: Inbox },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

const clientGroups = [
  {
    label: "Portal",
    links: [
      { to: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/client/upload-payroll", label: "Upload Payroll", icon: Upload },
      { to: "/client/invoices", label: "My Invoices", icon: FileText },
      { to: "/client/queries", label: "Support", icon: MessageSquare },
      { to: "/client/upload-history", label: "Upload History", icon: History },
    ],
  },
];

function isLinkActive(linkTo: string, pathname: string, role: string) {
  if (linkTo === `/${role}/dashboard`) return pathname === linkTo;
  return pathname === linkTo || pathname.startsWith(linkTo);
}

export function AppShell({ role }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  const groups = role === "admin" ? adminGroups : clientGroups;
  const allLinks = groups.flatMap((g) => g.links);
  const roleLabel = role === "admin" ? "FINANCE OPS" : "CLIENT PORTAL";
  const userInitial = email ? email[0].toUpperCase() : "?";
  const displayName = email?.split("@")[0] ?? "User";

  return (
    <SidebarProvider>
      <Sidebar variant="inset" className="bg-white border-r border-border">
        {/* Brand */}
        <SidebarHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <TiaLogo size="sm" withDot />
          </div>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {roleLabel}
          </p>
        </SidebarHeader>

        <SidebarContent className="px-3 py-2">
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 px-2 mb-1">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {group.links.map((link) => {
                    const active = isLinkActive(link.to, location.pathname, role);
                    return (
                      <SidebarMenuItem key={link.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={link.label}
                          className={
                            active
                              ? "bg-blue-50 text-blue-700 font-semibold rounded-lg border-l-[3px] border-blue-600 pl-[calc(0.5rem-3px)]"
                              : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                          }
                        >
                          <Link to={link.to}>
                            <link.icon className="h-4 w-4 shrink-0" />
                            <span className="text-[13px]">{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        {/* User footer */}
        <SidebarFooter className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {userInitial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium text-foreground">{email ?? "user"}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-white/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <button className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
            <div className="ml-1 h-6 w-px bg-border" />
            <div className="flex items-center gap-2 ml-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                {userInitial}
              </div>
              <span className="text-[13px] font-medium text-foreground hidden sm:inline">{displayName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
