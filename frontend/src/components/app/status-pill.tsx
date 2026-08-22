import { cn } from "@/lib/utils";

export type Tone = "success" | "warning" | "error" | "info" | "neutral";

const toneStyles: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-700",
  neutral: "bg-muted text-muted-foreground",
};

export function formatStatus(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusPillProps {
  label: string;
  tone: Tone | string;
  className?: string;
  raw?: boolean;
}

export function StatusPill({ label, tone, className, raw = false }: StatusPillProps) {
  const resolvedTone = (tone in toneStyles ? tone : "neutral") as Tone;
  const displayLabel = raw ? label : formatStatus(label);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        toneStyles[resolvedTone],
        className,
      )}
    >
      {displayLabel}
    </span>
  );
}
