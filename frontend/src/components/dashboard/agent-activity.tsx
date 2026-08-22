import type { TimesheetListItem, InvoiceListItem } from "@/lib/api";

interface AgentActivityProps {
  timesheets: TimesheetListItem[];
  invoices: InvoiceListItem[];
}

interface ActivityEvent {
  id: string;
  title: string;
  client: string;
  time: string;
  type: "invoice" | "parsed" | "validated" | "review";
  sortKey: number;
}

const typeStyles: Record<ActivityEvent["type"], { dot: string; label: string }> = {
  invoice: { dot: "bg-emerald-500", label: "Invoice" },
  parsed: { dot: "bg-blue-500", label: "Parsed" },
  validated: { dot: "bg-violet-500", label: "Validated" },
  review: { dot: "bg-amber-500", label: "Review" },
};

function timeAgoFromISO(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function deriveEvents(timesheets: TimesheetListItem[], invoices: InvoiceListItem[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const inv of invoices) {
    events.push({
      id: `inv-${inv.id}`,
      title: `Invoice ${inv.invoice_number} ${inv.status}`,
      client: inv.client_name,
      time: timeAgoFromISO(inv.generated_at),
      type: "invoice",
      sortKey: new Date(inv.generated_at).getTime(),
    });
  }

  for (const ts of timesheets) {
    const status = ts.status.toLowerCase();
    let type: ActivityEvent["type"] = "parsed";
    let title = `Payroll parsed`;

    if (status.includes("invoiced") || status === "complete") {
      continue; // already covered by invoices
    } else if (status.includes("validated") || status.includes("approved")) {
      type = "validated";
      title = "Payroll validated";
    } else if (status.includes("review") || status.includes("pending")) {
      type = "review";
      title = "Human review requested";
    }

    events.push({
      id: `ts-${ts.id}`,
      title,
      client: ts.client_name,
      time: timeAgoFromISO(ts.created_at),
      type,
      sortKey: new Date(ts.created_at).getTime(),
    });
  }

  return events.sort((a, b) => b.sortKey - a.sortKey).slice(0, 6);
}

export function AgentActivity({ timesheets, invoices }: AgentActivityProps) {
  const events = deriveEvents(timesheets, invoices);

  return (
    <div className="dashboard-card p-6 h-full">
      <div className="mb-4">
        <h3 className="section-title">TIA Agent Activity</h3>
        <p className="section-subtitle mt-0.5">Recent automation events</p>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-0">
          {events.map((event, i) => {
            const style = typeStyles[event.type];
            return (
              <div
                key={event.id}
                className={`flex items-start gap-3 py-2.5 animate-fade-in-up stagger-${i + 1} ${
                  i < events.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <div className="mt-1 flex flex-col items-center">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{event.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{event.client}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {event.time}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
