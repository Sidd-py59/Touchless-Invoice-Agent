import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
}

type ChartTooltipPayloadEntry = {
  name?: React.ReactNode;
  value?: React.ReactNode;
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: React.ReactNode;
};

type ChartTooltipProps = ChartTooltipContentProps & {
  content?: React.ReactElement<ChartTooltipContentProps> | null;
};

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: ChartContainerProps) {
  const style = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color]),
  ) as React.CSSProperties;

  return (
    <div className={cn("w-full", className)} style={style} {...props}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltip({ content, ...props }: ChartTooltipProps) {
  // recharts passes active, payload, label etc.
  if (!props.active || !props.payload?.length) return null;
  if (React.isValidElement(content)) {
    return React.cloneElement(content, props);
  }
  return null;
}

export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2 shadow-sm">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs text-muted-foreground">
          {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}
