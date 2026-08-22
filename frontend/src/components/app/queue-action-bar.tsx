import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";

export function QueueActionBar() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="gap-1.5">
        <CheckCircle className="h-4 w-4" />
        Approve
      </Button>
      <Button size="sm" variant="destructive" className="gap-1.5">
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5">
        <RotateCcw className="h-4 w-4" />
        Re-process
      </Button>
    </div>
  );
}