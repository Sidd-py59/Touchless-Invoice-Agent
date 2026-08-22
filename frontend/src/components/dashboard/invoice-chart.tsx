import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { AnalyticsData } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface InvoiceChartProps {
  data?: AnalyticsData;
  isLoading?: boolean;
}

const ranges = ["7 Days", "30 Days", "3 Months"] as const;

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function InvoiceChart({ data, isLoading }: InvoiceChartProps) {
  const [range, setRange] = useState<(typeof ranges)[number]>("30 Days");

  // Use real analytics data if available, fall back to invoicesGenerated series
  const chartData = data?.invoices_generated ?? [];

  return (
    <div className="dashboard-card p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="section-title">Invoice Processing</h3>
          <p className="section-subtitle mt-0.5">Processing volume over time</p>
        </div>
        <div className="flex rounded-lg border border-border bg-slate-50 p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${
                range === r
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : chartData.length > 0 ? (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="invoiceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Invoices"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#invoiceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[220px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No analytics data available</p>
        </div>
      )}
    </div>
  );
}
