import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DocumentSourcesProps {
  breakdown: { source: string; count: number }[];
}

const COLORS: Record<string, string> = {
  excel: "#2563eb",
  pdf: "#7c3aed",
  image: "#f59e0b",
  csv: "#10b981",
  email: "#06b6d4",
};

const DEFAULT_COLOR = "#94a3b8";

export function DocumentSources({ breakdown }: DocumentSourcesProps) {
  const total = breakdown.reduce((sum, s) => sum + s.count, 0);
  const data = breakdown.map((s) => ({
    name: s.source,
    value: s.count,
    pct: total > 0 ? ((s.count / total) * 100).toFixed(1) : "0",
    color: COLORS[s.source.toLowerCase()] ?? DEFAULT_COLOR,
  }));

  return (
    <div className="dashboard-card p-6 h-full">
      <div className="mb-4">
        <h3 className="section-title">Document Sources</h3>
        <p className="section-subtitle mt-0.5">Ingestion breakdown</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No documents yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{total}</span>
              <span className="text-[10px] text-muted-foreground">Total</span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs font-medium text-foreground capitalize">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{entry.value}</span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{entry.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
