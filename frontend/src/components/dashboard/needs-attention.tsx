import { Link } from "@tanstack/react-router";
import { AlertCircle, AlertTriangle, Eye, ArrowRight, CheckCircle2 } from "lucide-react";
import type { TimesheetListItem } from "@/lib/api";

interface NeedsAttentionProps {
  items: TimesheetListItem[];
}

function getSeverity(item: TimesheetListItem) {
  if (item.error_count > 3) return { color: "bg-red-500", icon: AlertCircle, label: "Critical" };
  if (item.error_count > 0) return { color: "bg-amber-500", icon: AlertTriangle, label: "Warning" };
  return { color: "bg-blue-500", icon: Eye, label: "Review" };
}

function timeAgoFromISO(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  const attentionItems = items
    .filter((t) => {
      const s = t.status.toLowerCase();
      return s.includes("pending") || s.includes("review") || s.includes("error") || s.includes("failed") || t.error_count > 0;
    })
    .slice(0, 5);

  return (
    <div className="dashboard-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">Needs Attention</h3>
          <p className="section-subtitle mt-0.5">Items requiring review</p>
        </div>
        {attentionItems.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
            {attentionItems.length}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {attentionItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground">All clear</p>
            <p className="text-xs text-muted-foreground mt-0.5">No documents require attention</p>
          </div>
        ) : (
          attentionItems.map((item, i) => {
            const severity = getSeverity(item);
            const SevIcon = severity.icon;

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-slate-50 animate-fade-in-up stagger-${i + 1}`}
              >
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${severity.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    {item.error_count > 0
                      ? `${item.error_count} validation ${item.error_count === 1 ? "issue" : "issues"}`
                      : `Document awaiting review`}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.client_name}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {timeAgoFromISO(item.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {attentionItems.length > 0 && (
        <Link
          to="/admin/human-review"
          className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
