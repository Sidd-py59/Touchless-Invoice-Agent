import {
  Upload,
  FileSearch,
  CheckCircle2,
  FileText,
  Send,
} from "lucide-react";

interface AIPipelineProps {
  totalDocuments: number;
  documentsThisMonth: number;
  validated: number;
  invoicesGenerated: number;
}

interface StageData {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  done: boolean;
  active: boolean;
}

export function AIPipeline({
  totalDocuments,
  documentsThisMonth,
  validated,
  invoicesGenerated,
}: AIPipelineProps) {
  const stages: StageData[] = [
    {
      label: "Ingested",
      icon: Upload,
      count: totalDocuments,
      done: totalDocuments > 0,
      active: false,
    },
    {
      label: "Parsed",
      icon: FileSearch,
      count: documentsThisMonth,
      done: documentsThisMonth > 0,
      active: false,
    },
    {
      label: "Validated",
      icon: CheckCircle2,
      count: validated,
      done: validated > 0,
      active: validated > 0 && invoicesGenerated < validated,
    },
    {
      label: "Invoiced",
      icon: FileText,
      count: invoicesGenerated,
      done: invoicesGenerated > 0,
      active: invoicesGenerated > 0,
    },
    {
      label: "Dispatched",
      icon: Send,
      done: false,
      active: false,
    },
  ];

  const progressPct = totalDocuments > 0
    ? Math.round((invoicesGenerated / totalDocuments) * 100)
    : 0;

  return (
    <div className="dashboard-card p-6 animate-fade-in-up stagger-6">
      <div className="mb-6">
        <h2 className="section-title text-base">AI Invoice Pipeline</h2>
        <p className="section-subtitle mt-0.5">
          Real-time document-to-invoice automation
        </p>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-center justify-between gap-0">
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          const isLast = i === stages.length - 1;

          return (
            <div key={stage.label} className="flex items-center flex-1">
              {/* Stage node */}
              <div className="flex flex-col items-center gap-2 min-w-[72px]">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${
                    stage.done
                      ? "border-blue-500 bg-blue-500 text-white"
                      : stage.active
                        ? "border-blue-400 bg-blue-50 text-blue-600 animate-pipeline-pulse"
                        : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {stage.done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">{stage.label}</p>
                  {stage.count !== undefined && (
                    <p className="text-[11px] font-semibold text-blue-600">{stage.count}</p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-1 h-0.5 relative">
                  <div className="absolute inset-0 bg-slate-200 rounded-full" />
                  {stage.done && (
                    <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-700" style={{ width: "100%" }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-6 space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{progressPct}%</span> of uploaded documents have reached invoice generation
        </p>
      </div>
    </div>
  );
}
