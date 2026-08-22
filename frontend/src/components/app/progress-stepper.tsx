import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import type { PipelineStage } from "@/lib/types";

interface ProgressStepperProps {
  stages: PipelineStage[];
  activeStage?: string;
}

export function ProgressStepper({ stages, activeStage }: ProgressStepperProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {stages.map((stage, i) => {
        const isActive = stage.label === activeStage;
        const isDone = stage.done === true;

        return (
          <div key={stage.label} className="flex flex-col items-center gap-1.5 text-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                isDone
                  ? "border-primary bg-primary text-primary-foreground"
                  : isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground",
              )}
            >
              {isDone ? (
                <CheckCircle className="h-5 w-5" />
              ) : stage.count !== undefined ? (
                stage.count
              ) : (
                i + 1
              )}
            </div>
            <span className="text-xs text-muted-foreground">{stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}
