import type { ClientListItem } from "@/lib/api";

interface ClientInsightsProps {
  clients: ClientListItem[];
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n}`;
}

const statusDot: Record<string, string> = {
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  "at risk": "bg-amber-500",
};

export function ClientInsights({ clients }: ClientInsightsProps) {
  // Sort by invoice_count descending and take top 5
  const top = [...clients]
    .sort((a, b) => b.invoice_count - a.invoice_count)
    .slice(0, 5);

  return (
    <div className="dashboard-card p-6">
      <div className="mb-4">
        <h3 className="section-title">Top Clients</h3>
        <p className="section-subtitle mt-0.5">By invoice volume</p>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No clients yet</p>
      ) : (
        <div className="space-y-3">
          {top.map((client, i) => {
            const initials = client.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();

            const statusClass = client.is_active
              ? statusDot["active"]
              : statusDot["inactive"];

            return (
              <div
                key={client.id}
                className={`flex items-center gap-3 animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{client.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {client.document_count} docs · {client.invoice_count} invoices
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusClass}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
