import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Upload, FileText, Clock, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { StatusPill } from "@/components/app/status-pill";
import type { KPIStat } from "@/lib/types";
import { api, fmtAmount } from "@/lib/api";
import { useClientId } from "@/lib/auth-context";
import { invoiceStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/client/dashboard")({
  head: () => ({
    meta: [
      { title: "Client Dashboard | TIA" },
      { name: "description", content: "Track uploads, processing, and invoices." },
    ],
  }),
  component: ClientDashboardPage,
});

function ClientDashboardPage() {
  const clientId = useClientId();
  const { data: overview } = useQuery({
    queryKey: ["portal-overview", clientId],
    queryFn: () => api.getPortalOverview(clientId),
    refetchInterval: 30_000,
  });

  const { data: invoices } = useQuery({
    queryKey: ["portal-invoices", clientId],
    queryFn: () => api.listPortalInvoices(clientId, { page_size: 5 }),
  });

  const outstanding = Number(overview?.outstanding_amount ?? 0);

  const stats: KPIStat[] = overview
    ? [
        { label: "Total Invoices", value: String(overview.total_invoices), icon: FileText, status: "info" },
        {
          label: "Outstanding",
          value: outstanding > 0 ? fmtAmount(overview.outstanding_amount) : "Nil",
          hint: outstanding > 0 ? "Awaiting payment" : "All settled",
          icon: Banknote,
          status: outstanding > 0 ? "warning" : "success",
        },
        {
          label: "Processing",
          value: String(overview.pending_documents),
          hint: overview.pending_documents > 0 ? "Documents in pipeline" : "Pipeline clear",
          icon: Clock,
          status: overview.pending_documents > 0 ? "info" : "neutral",
        },
        {
          label: "Last Upload",
          value: overview.last_upload_at ? new Date(overview.last_upload_at).toLocaleDateString() : "None yet",
          icon: Upload,
          status: "neutral",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title={overview ? overview.client_name : "Client Dashboard"}
          description="Monitor payroll uploads, AI processing status, and generated invoices."
        />
        <Button asChild size="sm" className="h-8 shrink-0 gap-1.5 text-xs">
          <Link to="/client/upload-payroll">
            <Upload className="h-3.5 w-3.5" />
            Upload Payroll
          </Link>
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Recent invoices */}
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
            <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/client/invoices">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(invoices?.items ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-foreground">{inv.invoice_number}</p>
                  <p className="text-[11px] text-muted-foreground">{inv.billing_period}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 shrink-0">
                  <StatusPill label={inv.status} tone={invoiceStatusTone(inv.status)} />
                  <p className="text-xs font-bold tabular-nums text-foreground">{fmtAmount(inv.grand_total, inv.currency)}</p>
                </div>
              </div>
            ))}
            {!invoices && (
              <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
            )}
            {invoices?.items.length === 0 && (
              <div className="py-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-xs text-muted-foreground">No invoices generated yet.</p>
                <p className="text-[11px] text-muted-foreground/60">Upload a payroll file to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-between text-xs" size="sm">
              <Link to="/client/upload-payroll">
                Upload Payroll File
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-between text-xs" size="sm">
              <Link to="/client/invoices">
                View My Invoices
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-between text-xs" size="sm">
              <Link to="/client/upload-history">
                Upload History
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
