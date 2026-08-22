import { Upload } from "lucide-react";

export function UploadDropzone() {
  return (
    <div className="grid place-items-center rounded-lg border-2 border-dashed border-border bg-background p-10 transition-colors hover:border-primary/40">
      <div className="text-center">
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Drop payroll files here or click to upload
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supported: .xlsx, .csv, .pdf — Max 25 MB
        </p>
      </div>
    </div>
  );
}