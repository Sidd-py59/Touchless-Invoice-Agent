import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ArrowUpRight } from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/admin/human-review")({
  head: () => ({
    meta: [
      { title: "Human Review | TIA" },
      { name: "description", content: "Review exception cases flagged by AI validation." },
    ],
  }),
  component: HumanReviewPage,
});

function HumanReviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["validation-queue"],
    queryFn: () => api.getValidationQueue({ page_size: 50 }),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Human Review"
        description="Timesheets with unresolved validation errors that need your attention before invoicing."
      />

      {isLoading && (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      )}
      {error && (
        <p className="py-10 text-center text-sm text-destructive">Failed to load review queue.</p>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">No timesheets require manual review right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {(data?.items ?? []).map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.client_name}</p>
                  <p className="text-xs text-muted-foreground">Period: {item.billing_period}</p>
                </div>
              </div>
              <StatusPill
                label={`${item.error_count} error${item.error_count !== 1 ? "s" : ""}`}
                tone="warning"
                raw
              />
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{item.entry_count}</span> employee entries ·
                  Created <span className="font-medium text-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                </p>
                <p className="text-xs text-amber-600 font-medium">
                  Resolve all validation errors to unlock invoice generation.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 gap-1.5 text-xs ml-4 shrink-0">
                <Link to="/admin/payroll-queue/$id" params={{ id: String(item.id) }}>
                  Review
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
