import type { ReactNode } from "react";

interface TableCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function TableCard({ title, description, action, children }: TableCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}
