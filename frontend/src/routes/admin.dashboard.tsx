import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Upload, AlertTriangle, CheckCircle2, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/app/status-pill";
import { StatCard, StatCardSkeleton } from "@/components/app/stat-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AIPipeline } from "@/components/dashboard/ai-pipeline";
import { InvoiceChart } from "@/components/dashboard/invoice-chart";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AgentActivity } from "@/components/dashboard/agent-activity";
import { DocumentSources } from "@/components/dashboard/document-sources";
import { SystemHealth } from "@/components/dashboard/system-health";
import { ClientInsights } from "@/components/dashboard/client-insights";
import { api, fmtAmount } from "@/lib/api";
import { payrollStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | TIA" },
      { name: "description", content: "Live overview of TASC finance operations." },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { data: overview, dataUpdatedAt } = useQuery({
    queryKey: ["finance-overview"],
    queryFn: () => api.getFinanceOverview(),
    refetchInterval: 30_000,
  });

  const { data: timesheets } = useQuery({
    queryKey: ["timesheets-recent"],
    queryFn: () => api.listTimesheets({ page_size: 5 }),
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices-recent"],
    queryFn: () => api.listInvoices({ page_size: 5 }),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.getAnalytics(),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => api.listClients(),
  });

  const { data: validationQueue } = useQuery({
    queryKey: ["validation-queue-dashboard"],
    queryFn: () => api.getValidationQueue({ page_size: 10 }),
  });

  /* ── KPI Cards ─────────────────────────────── */
  const pendingStatus: "warning" | "success" = (overview?.pending_validation ?? 0) > 0 ? "warning" : "success";
  const stats = overview
    ? [
        { label: "Documents This Month", value: String(overview.documents_this_month), hint: `${overview.total_documents} total`, icon: Upload, status: "info" as const },
        { label: "Pending Review", value: String(overview.pending_validation), hint: "Need validation", icon: AlertTriangle, status: pendingStatus },
        { label: "Validated", value: String(overview.validated), hint: "Timesheets ready", icon: CheckCircle2, status: "success" as const },
        { label: "Invoices Generated", value: String(overview.invoices_generated), hint: "All time", icon: FileText, status: "info" as const },
        { label: "Total Invoice Value", value: fmtAmount(overview.total_revenue), icon: TrendingUp, status: "success" as const },
      ]
    : null;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Row 1 — Header */}
      <DashboardHeader lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />

      {/* Row 2 — KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats
          ? stats.map((item, i) => <StatCard key={i} item={item} index={i} />)
          : Array.from({ length: 5 }, (_, i) => <StatCardSkeleton key={i} />)}
      </section>

      {/* Row 3 — AI Pipeline */}
      {overview && (
        <AIPipeline
          totalDocuments={overview.total_documents}
          documentsThisMonth={overview.documents_this_month}
          validated={overview.validated}
          invoicesGenerated={overview.invoices_generated}
        />
      )}

      {/* Row 4 — Chart + Needs Attention */}
      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <InvoiceChart data={analytics} isLoading={analyticsLoading} />
        <NeedsAttention items={validationQueue?.items ?? timesheets?.items ?? []} />
      </section>

      {/* Row 5 — Payroll Queue + Recent Invoices */}
      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        {/* Payroll Queue */}
        <div className="dashboard-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="section-title">Recent Payroll Queue</h3>
              <p className="section-subtitle mt-0.5">Latest processed timesheets</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/admin/payroll-queue">
                View all <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Client</TableHead>
                <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Period</TableHead>
                <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Entries</TableHead>
                <TableHead className="h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(timesheets?.items ?? []).map((row) => (
                <TableRow key={row.id} className="group cursor-pointer hover:bg-slate-50/50">
                  <TableCell className="py-3 font-medium text-[13px]">{row.client_name}</TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">{row.billing_period}</TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">{row.entry_count}</TableCell>
                  <TableCell className="py-3">
                    <StatusPill label={row.status} tone={payrollStatusTone(row.status)} />
                  </TableCell>
                </TableRow>
              ))}
              {!timesheets && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {timesheets?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                    No timesheets yet. Upload a payroll file to begin.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Recent Invoices */}
        <div className="dashboard-card p-5 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Recent Invoices</h3>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-muted-foreground hover:text-foreground">
              <Link to="/admin/invoices">
                View all <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            {(invoices?.items ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3 transition-colors hover:bg-slate-50/50 hover:border-slate-300">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{inv.invoice_number}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{inv.client_name}</p>
                </div>
                <div className="ml-3 text-right shrink-0">
                  <p className="text-[13px] font-semibold text-foreground">{fmtAmount(inv.grand_total, inv.currency)}</p>
                  <StatusPill label={inv.status} tone={inv.status === "sent" ? "success" : "info"} />
                </div>
              </div>
            ))}
            {!invoices && (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
            )}
            {invoices?.items.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">No invoices yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Row 6 — Agent Activity + Document Sources + System Health */}
      <section className="grid gap-4 xl:grid-cols-3">
        <AgentActivity
          timesheets={timesheets?.items ?? []}
          invoices={invoices?.items ?? []}
        />
        <DocumentSources breakdown={overview?.source_breakdown ?? []} />
        <SystemHealth />
      </section>

      {/* Row 7 — Client Insights */}
      {clients && clients.items.length > 0 && (
        <ClientInsights clients={clients.items} />
      )}
    </div>
  );
}
