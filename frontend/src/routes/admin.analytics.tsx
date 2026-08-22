import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PageTitle } from "@/components/app/page-title";
import { StatCard } from "@/components/app/stat-card";
import { analyticsSeries } from "@/lib/mock-data";
import type { KPIStat } from "@/lib/types";
import { api, fmtAmount } from "@/lib/api";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics | TIA" },
      {
        name: "description",
        content:
          "Executive analytics for invoice output, processing speed, AI accuracy, and dispatch performance.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const invoicesChartConfig = {
  value: {
    label: "Invoices",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const processingChartConfig = {
  processingTime: {
    label: "Processing Time (min)",
    color: "hsl(var(--chart-2, 200 80% 60%))",
  },
  aiAccuracy: {
    label: "AI Accuracy (%)",
    color: "hsl(var(--chart-1, 142 71% 45%))",
  },
} satisfies ChartConfig;

function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ["finance-overview"],
    queryFn: () => api.getFinanceOverview(),
  });

  const { data: analytics } = useQuery({
    queryKey: ["finance-analytics"],
    queryFn: () => api.getAnalytics(),
  });

  const invoicesChartData =
    analytics && analytics.invoices_generated.length > 0
      ? analytics.invoices_generated
      : analyticsSeries.invoicesGenerated;

  const kpis: KPIStat[] = overview
    ? [
        { label: "Total Documents", value: String(overview.total_documents), hint: "All time", status: "info" },
        { label: "This Month", value: String(overview.documents_this_month), hint: "Uploads", status: "info" },
        { label: "Validated", value: String(overview.validated), hint: "Timesheets", status: "success" },
        { label: "Pending Validation", value: String(overview.pending_validation), hint: "Needs review", status: "warning" },
        { label: "Invoices Generated", value: String(overview.invoices_generated), hint: "All time", status: "success" },
        { label: "Total Revenue", value: fmtAmount(overview.total_revenue), hint: "Billed", status: "info" },
      ]
    : [
        { label: "Invoices Generated", value: "—", hint: "This month", status: "success" },
        { label: "Processing Time", value: "3.5 min", hint: "Average per file", status: "info" },
        { label: "AI Accuracy", value: "94.6%", hint: "Last 30 days", status: "success" },
        { label: "Validation Errors", value: "—", hint: "Needs review", status: "warning" },
        { label: "Revenue", value: "—", hint: "Monthly billed", status: "info" },
        { label: "Dispatch Success", value: "98.2%", hint: "Delivery rate", status: "success" },
      ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Analytics"
        description="Balanced executive view of operational output, speed, accuracy, and revenue quality."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {/* Area chart with gradient fill — invoice volume over time */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Invoice Volume</CardTitle>
            <CardDescription>Monthly invoices generated over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={invoicesChartConfig} className="h-64 w-full">
              <AreaChart data={invoicesChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="invoiceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={2.5}
                  fill="url(#invoiceGradient)"
                  dot={{ r: 3.5, fill: "var(--color-value)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Composed chart — accuracy trend (area) + processing time (bars) */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Accuracy vs Processing Time</CardTitle>
            <CardDescription>AI confidence rising as processing time drops</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={processingChartConfig} className="h-64 w-full">
              <ComposedChart
                data={analyticsSeries.processingAndAccuracy}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-aiAccuracy)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-aiAccuracy)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  yAxisId="accuracy"
                  domain={[85, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  width={32}
                />
                <YAxis
                  yAxisId="time"
                  orientation="right"
                  domain={[0, 6]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  yAxisId="time"
                  dataKey="processingTime"
                  fill="var(--color-processingTime)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.6}
                  barSize={28}
                />
                <Area
                  yAxisId="accuracy"
                  type="monotone"
                  dataKey="aiAccuracy"
                  stroke="var(--color-aiAccuracy)"
                  strokeWidth={2.5}
                  fill="url(#accuracyGradient)"
                  dot={{ r: 3.5, fill: "var(--color-aiAccuracy)", strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
