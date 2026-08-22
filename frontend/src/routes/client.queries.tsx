import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, CheckCircle2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { PageTitle } from "@/components/app/page-title";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { api } from "@/lib/api";
import { useClientId } from "@/lib/auth-context";

export const Route = createFileRoute("/client/queries")({
  head: () => ({
    meta: [
      { title: "Support Queries | TIA" },
      { name: "description", content: "Raise queries or disputes about your invoices for the FinOps team." },
    ],
  }),
  component: ClientQueriesPage,
});

const statusTone = (s: string) =>
  s === "resolved" ? "success" : s === "in_progress" ? "warning" : "info";

function ClientQueriesPage() {
  const clientId = useClientId();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["client-queries", clientId],
    queryFn: () => api.listClientQueries(clientId),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.submitQuery(clientId, { subject: subject.trim(), body: body.trim() }),
    onSuccess: () => {
      toast.success("Query submitted — FinOps will respond shortly.");
      setSubject("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["client-queries", clientId] });
    },
    onError: () => toast.error("Failed to submit query. Please try again."),
  });

  const canSubmit = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Support Queries"
        description="Raise questions or disputes about your invoices. The FinOps team will respond."
      />

      {/* Submit form */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
          <MessageSquare className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Raise a New Query</p>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Invoice amount incorrect for May 2026"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Details</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            {submitMutation.isPending ? "Submitting…" : "Submit Query"}
          </Button>
        </div>
      </div>

      {/* Query history */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            My Queries
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
            <p className="text-sm font-medium text-muted-foreground">No queries yet</p>
            <p className="text-xs text-muted-foreground/60">Your submitted queries will appear here.</p>
          </div>
        )}

        <div className="divide-y divide-border">
          {(data?.items ?? []).map((q) => (
            <div key={q.id} className="px-5 py-4">
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{q.subject}</p>
                <StatusPill label={q.status.replace("_", " ")} tone={statusTone(q.status)} />
              </div>
              <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{q.body}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                {new Date(q.created_at).toLocaleDateString()}
                {q.invoice_id && <span>· Invoice #{q.invoice_id}</span>}
              </div>
              {q.resolution_note && (
                <div className="mt-3 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs">
                  <span className="font-medium text-success">FinOps replied: </span>
                  <span className="text-foreground">{q.resolution_note}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
