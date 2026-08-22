import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Send, CheckCircle2, FileText, Clock } from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { api, fmtAmount } from "@/lib/api";
import { invoiceStatusTone } from "@/lib/ui-mappers";
import type { InvoiceListItem } from "@/lib/api";

export const Route = createFileRoute("/admin/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch | TIA" },
      { name: "description", content: "Track invoice delivery status and dispatch stage progression." },
    ],
  }),
  component: DispatchPage,
});

type DispatchStep = { label: string; icon: typeof FileText; done: boolean; timestamp?: string };

function buildTimeline(inv: InvoiceListItem): DispatchStep[] {
  const isApproved = inv.approval_status === "approved";
  const isSent = inv.status === "sent";
  const genTime = new Date(inv.generated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" });

  return [
    { label: "Generated", icon: FileText, done: true, timestamp: genTime },
    { label: "Approved", icon: CheckCircle2, done: isApproved, timestamp: isApproved ? "✓" : undefined },
    { label: "Dispatched", icon: Send, done: isSent, timestamp: isSent ? "✓" : undefined },
  ];
}

function DispatchPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices-dispatch"],
    queryFn: () => api.listInvoices({ page_size: 50 }),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Dispatch"
        description="Monitor invoice delivery pipeline from generation through approval to client dispatch."
      />

      {isLoading && (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      )}
      {error && (
        <p className="py-10 text-center text-sm text-destructive">Failed to load invoices.</p>
      )}
      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Send className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="mt-4 text-sm font-semibold text-foreground">No dispatches yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Generated invoices will appear here once approved and sent.</p>
        </div>
      )}

      <div className="space-y-3">
        {(data?.items ?? []).map((inv) => {
          const steps = buildTimeline(inv);
          const progress = steps.filter((s) => s.done).length;
          const pct = Math.round((progress / steps.length) * 100);

          return (
            <div key={inv.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold text-foreground">{inv.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.client_name} · {inv.billing_period}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold tabular-nums text-foreground">{fmtAmount(inv.grand_total, inv.currency)}</span>
                  <StatusPill label={inv.status} tone={invoiceStatusTone(inv.status)} />
                </div>
              </div>

              <div className="px-5 py-4">
                {/* Progress bar */}
                <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-3 gap-2">
                  {steps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.label}
                        className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 ${
                          step.done
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon
                            className={`h-3.5 w-3.5 ${step.done ? "text-emerald-600" : "text-muted-foreground/40"}`}
                          />
                          <span className={`text-xs font-medium ${step.done ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {step.label}
                          </span>
                        </div>
                        {step.timestamp && (
                          <p className="text-[10px] text-muted-foreground pl-5">{step.timestamp}</p>
                        )}
                        {!step.timestamp && (
                          <div className="flex items-center gap-1 pl-5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground/40" />
                            <span className="text-[10px] text-muted-foreground/50">Pending</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
