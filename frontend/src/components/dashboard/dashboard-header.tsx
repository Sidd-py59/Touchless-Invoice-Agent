import { Bell } from "lucide-react";

interface DashboardHeaderProps {
  lastUpdated?: Date;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function DashboardHeader({ lastUpdated }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}, Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening with your invoice operations today.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {lastUpdated && (
          <span className="text-xs text-muted-foreground">
            Last synced {timeAgo(lastUpdated)}
          </span>
        )}
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[11px] font-medium text-emerald-700">Live</span>
        </div>
      </div>
    </div>
  );
}
