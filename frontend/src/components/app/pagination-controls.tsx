import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls() {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">Showing 1–4 of 4 results</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}