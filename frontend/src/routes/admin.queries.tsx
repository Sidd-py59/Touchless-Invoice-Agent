import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Inbox, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { PageTitle } from "@/components/app/page-title";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { api } from "@/lib/api";
import type { QueryListItem } from "@/lib/api";

export const Route = createFileRoute("/admin/queries")({
  head: () => ({
    meta: [
      { title: "Client Queries | TIA" },
      { name: "description", content: "FinOps inbox — review and resolve client queries." },
    ],
  }),
  component: AdminQueriesPage,
});

const statusTone = (s: string) =>
  s === "resolved" ? "success" : s === "in_progress" ? "warning" : "info";

function AdminQueriesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [resolving, setResolving] = useState<{ id: number; note: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-queries", filter],
    queryFn: () => api.listQueries(filter === "all" ? {} : { status: filter }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.resolveQuery(id, { resolution_note: note, resolved_by: "finops_team" }),
    onSuccess: () => {
      toast.success("Query resolved and client notified.");
      setResolving(null);
      queryClient.invalidateQueries({ queryKey: ["admin-queries"] });
    },
    onError: () => toast.error("Failed to resolve query."),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Client Queries"
        description="Review and resolve queries raised by clients about their invoices."
      />

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        {(["open", "all", "resolved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              filter === f
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Resolve modal */}
      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <p className="mb-3 text-sm font-semibold text-foreground">Resolve Query #{resolving.id}</p>
            <textarea
              value={resolving.note}
              onChange={(e) => setResolving({ ...resolving, note: e.target.value })}
              rows={4}
              placeholder="Write your resolution note for the client…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setResolving(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!resolving.note.trim() || resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ id: resolving.id, note: resolving.note })}
              >
                {resolveMutation.isPending ? "Saving…" : "Mark Resolved"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Query list */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
          <Inbox className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Queries
            {data && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.total}
              </span>
            )}
          </p>
        </div>

        {isLoading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}

        {!isLoading && data?.items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No queries here</p>
            <p className="text-xs text-muted-foreground/60">Client queries will appear when submitted.</p>
          </div>
        )}

        <div className="divide-y divide-border">
          {(data?.items ?? []).map((q) => (
            <QueryRow
              key={q.id}
              query={q}
              onResolve={() => setResolving({ id: q.id, note: "" })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function QueryRow({ query, onResolve }: { query: QueryListItem; onResolve: () => void }) {
  const statusToneVal = statusTone(query.status);
  return (
    <div className="px-5 py-4">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-semibold text-foreground">{query.subject}</p>
            <p className="text-xs text-muted-foreground">{query.client_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill label={query.status.replace("_", " ")} tone={statusToneVal} />
          {query.status !== "resolved" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onResolve}>
              Resolve
            </Button>
          )}
        </div>
      </div>
      <p className="mb-2 ml-6.5 text-xs text-muted-foreground line-clamp-2">{query.body}</p>
      <div className="ml-6.5 flex items-center gap-3 text-[11px] text-muted-foreground/60">
        <Clock className="h-3 w-3" />
        {new Date(query.created_at).toLocaleDateString()}
        {query.invoice_id && <span>· Invoice #{query.invoice_id}</span>}
      </div>
      {query.resolution_note && (
        <div className="mt-3 ml-6.5 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs">
          <span className="font-medium text-success">Resolution: </span>
          <span className="text-foreground">{query.resolution_note}</span>
          {query.resolved_by && (
            <span className="ml-2 text-muted-foreground/60">— {query.resolved_by}</span>
          )}
        </div>
      )}
    </div>
  );
}
