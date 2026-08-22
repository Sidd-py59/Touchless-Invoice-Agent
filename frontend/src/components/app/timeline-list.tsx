import type { TimelineItem } from "@/lib/types";

interface TimelineListProps {
  items: TimelineItem[];
}

export function TimelineList({ items }: TimelineListProps) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
