import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface HealthItem {
  label: string;
  status: "operational" | "degraded" | "down";
}

export function SystemHealth() {
  const [backendUp, setBackendUp] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) });
        setBackendUp(res.ok);
      } catch {
        setBackendUp(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const items: HealthItem[] = [
    { label: "OCR Engine", status: backendUp === false ? "degraded" : "operational" },
    { label: "AI Parser", status: backendUp === false ? "degraded" : "operational" },
    { label: "Invoice Engine", status: "operational" },
    { label: "Backend API", status: backendUp === null ? "operational" : backendUp ? "operational" : "down" },
  ];

  const allOperational = items.every((i) => i.status === "operational");

  return (
    <div className="dashboard-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="section-title">System Health</h3>
          <p className="section-subtitle mt-0.5">Service status</p>
        </div>
        {allOperational && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            All systems operational
          </span>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {item.status === "operational" ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ) : item.status === "degraded" ? (
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-red-500" />
              )}
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </div>
            <span
              className={`text-[11px] font-medium ${
                item.status === "operational"
                  ? "text-emerald-600"
                  : item.status === "degraded"
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            >
              {item.status === "operational" ? "Operational" : item.status === "degraded" ? "Degraded" : "Down"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Uptime</span>
          <span className="text-xs font-semibold text-foreground">99.8%</span>
        </div>
      </div>
    </div>
  );
}
