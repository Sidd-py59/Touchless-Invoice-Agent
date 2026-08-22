import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { KPIStat } from "@/lib/types";

interface StatCardProps {
  item: KPIStat;
  index?: number;
}

const statusBorder: Record<string, string> = {
  success: "border-l-emerald-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
  neutral: "border-l-slate-300",
};

const statusIconBg: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-blue-50 text-blue-600",
  neutral: "bg-slate-50 text-slate-500",
};

function formatCompact(raw: string): { display: string; full: string | null } {
  // Try to extract a currency + number pattern like "AED 42,272,071.30"
  const match = raw.match(/^([A-Z]{3})\s+([\d,]+\.?\d*)$/);
  if (!match) return { display: raw, full: null };

  const currency = match[1];
  const num = parseFloat(match[2].replace(/,/g, ""));
  if (isNaN(num)) return { display: raw, full: null };

  if (num >= 1_000_000) {
    return {
      display: `${currency} ${(num / 1_000_000).toFixed(2)}M`,
      full: raw,
    };
  }
  if (num >= 1_000) {
    return {
      display: `${currency} ${(num / 1_000).toFixed(1)}K`,
      full: raw,
    };
  }
  return { display: raw, full: null };
}

export function StatCard({ item, index = 0 }: StatCardProps) {
  const Icon = item.icon;
  const border = statusBorder[item.status ?? "neutral"];
  const iconBg = statusIconBg[item.status ?? "neutral"];
  const { display, full } = formatCompact(item.value);

  const card = (
    <div
      className={`dashboard-card border-l-[3px] ${border} p-5 animate-fade-in-up stagger-${index + 1}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {item.label}
        </p>
        {Icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{display}</p>
      {item.hint && (
        <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
      )}
    </div>
  );

  if (full) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">{full}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
}

export function StatCardSkeleton() {
  return (
    <div className="dashboard-card p-5 border-l-[3px] border-l-slate-200">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}
