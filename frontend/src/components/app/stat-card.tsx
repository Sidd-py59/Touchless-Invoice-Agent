import type { KPIStat } from "@/lib/types";

interface StatCardProps {
  item: KPIStat;
}

export function StatCard({ item }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{item.label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-0.5px" }}>
        {item.value}
      </p>
      {item.hint && (
        <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
      )}
    </div>
  );
}
