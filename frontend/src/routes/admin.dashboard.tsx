import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Upload, AlertTriangle, CheckCircle2, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { ProgressStepper } from "@/components/app/progress-stepper";
import { TableCard } from "@/components/app/table-card";
import { StatusPill } from "@/components/app/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const { data: overview } = useQuery({
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
    queryFn: () => api.listInvoices({ page_size: 3 }),
  });

  const pendingStatus: "warning" | "success" = (overview?.pending_validation ?? 0) > 0 ? "warning" : "success";
  const stats = overview
    ? [
        { label: "Docs This Month", value: String(overview.documents_this_month), hint: `${overview.total_documents} total`, icon: Upload, status: "info" as const },
        { label: "Pending Review", value: String(overview.pending_validation), hint: "Need validation", icon: AlertTriangle, status: pendingStatus },
        { label: "Validated", value: String(overview.validated), hint: "Timesheets ready", icon: CheckCircle2, status: "success" as const },
        { label: "Invoices Generated", value: String(overview.invoices_generated), hint: "All time", icon: FileText, status: "info" as const },
        { label: "Total Revenue", value: fmtAmount(overview.total_revenue), icon: TrendingUp, status: "success" as const },
      ]
    : Array.from({ length: 5 }, () => ({
        label: "–", value: "…", icon: Upload, status: "neutral" as const,
      }));

  const totalSteps = 5;
  const validatedCount = overview?.validated ?? 0;
  const invoiceCount = overview?.invoices_generated ?? 0;
  const progressPct = overview
    ? Math.round((invoiceCount / Math.max(overview.total_documents, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Operations Overview"
        description="Live view of the payroll-to-invoice pipeline across all clients."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item, i) => (
          <StatCard key={i} item={item} />
        ))}
      </section>

      {/* Pipeline */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">AI Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProgressStepper
            stages={[
              { label: "Ingested", done: true },
              { label: "Parsed", done: (overview?.documents_this_month ?? 0) > 0 },
              { label: "Validated", count: overview?.validated },
              { label: "Invoiced", count: overview?.invoices_generated },
              { label: "Dispatched" },
            ]}
            activeStage="Invoiced"
          />
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progressPct}% of uploaded documents have reached invoice generation
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* Timesheet queue */}
        <div className="xl:col-span-3">
          <TableCard
            title="Recent Payroll Queue"
            action={
              <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                <Link to="/admin/payroll-queue">
                  View all
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Client</TableHead>
                  <TableHead className="h-9 text-xs">Period</TableHead>
                  <TableHead className="h-9 text-xs">Entries</TableHead>
                  <TableHead className="h-9 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(timesheets?.items ?? []).map((row) => (
                  <TableRow key={row.id} className="group">
                    <TableCell className="py-2.5 font-medium">{row.client_name}</TableCell>
                    <TableCell className="py-2.5 text-muted-foreground">{row.billing_period}</TableCell>
                    <TableCell className="py-2.5 text-muted-foreground">{row.entry_count}</TableCell>
                    <TableCell className="py-2.5">
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
          </TableCard>
        </div>

        {/* Recent invoices */}
        <div className="xl:col-span-2">
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
              <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                <Link to="/admin/invoices">
                  View all
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(invoices?.items ?? []).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{inv.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{inv.client_name}</p>
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">{fmtAmount(inv.grand_total, inv.currency)}</p>
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

              {/* Source breakdown */}
              {overview && overview.source_breakdown.length > 0 && (
                <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ingestion Sources</p>
                  {overview.source_breakdown.map((s) => (
                    <div key={s.source} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-muted-foreground">{s.source}</span>
                      <span className="font-semibold text-foreground">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
