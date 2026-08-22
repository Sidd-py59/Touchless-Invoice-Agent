import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/app/page-title";
import { ProgressStepper } from "@/components/app/progress-stepper";
import { StatusPill } from "@/components/app/status-pill";
import { api } from "@/lib/api";
import { useClientId } from "@/lib/auth-context";

export const Route = createFileRoute("/client/upload-payroll")({
  head: () => ({
    meta: [
      { title: "Upload Payroll | TIA" },
      {
        name: "description",
        content:
          "Upload payroll files and track AI processing stages from parsing to invoice generation.",
      },
    ],
  }),
  component: UploadPayrollPage,
});

const pipelineStages = [
  { label: "Upload", done: false },
  { label: "Parsing", done: false },
  { label: "Normalizing", done: false },
  { label: "Validating", done: false },
  { label: "Generating Invoice", done: false },
];

function UploadPayrollPage() {
  const clientId = useClientId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadPortalFile(clientId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-documents", clientId] });
      queryClient.invalidateQueries({ queryKey: ["portal-overview", clientId] });
      setFileName(null);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    uploadMutation.mutate(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setFileName(file.name);
    uploadMutation.mutate(file);
  }

  const isUploading = uploadMutation.isPending;
  const isSuccess = uploadMutation.isSuccess;
  const isError = uploadMutation.isError;

  const activeStage = isUploading
    ? "Upload"
    : isSuccess
    ? "Generating Invoice"
    : undefined;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Upload Payroll"
        description="Drop payroll files and monitor the AI extraction and invoice generation pipeline."
      />

      <div
        className={`grid place-items-center rounded-lg border-2 border-dashed p-10 transition-colors ${
          isUploading
            ? "border-primary/60 bg-primary/5"
            : isSuccess
            ? "border-success/60 bg-success/5"
            : isError
            ? "border-destructive/60 bg-destructive/5"
            : "border-border bg-background hover:border-primary/40"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{ cursor: isUploading ? "default" : "pointer" }}
      >
        <div className="text-center">
          {isSuccess ? (
            <CheckCircle className="mx-auto h-10 w-10 text-success" />
          ) : isError ? (
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
          ) : (
            <Upload className={`mx-auto h-10 w-10 ${isUploading ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
          )}
          <p className="mt-3 text-sm font-medium text-foreground">
            {isUploading
              ? `Processing ${fileName}…`
              : isSuccess
              ? "Upload complete! AI pipeline running."
              : isError
              ? "Upload failed. Try again."
              : "Drop payroll files here or click to upload"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supported: .xlsx, .csv, .pdf · Max 25 MB
          </p>
          {!isUploading && (
            <Button className="mt-4" size="sm" variant={isError ? "destructive" : "default"}>
              {isSuccess ? "Upload Another" : isError ? "Retry" : "Choose File"}
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv,.pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Ingestion channels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <StatusPill label="Portal Upload" tone="success" />
          <StatusPill label="Email" tone="neutral" />
          <StatusPill label="Handwritten (OCR)" tone="neutral" />
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">AI pipeline status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressStepper
            stages={pipelineStages.map((s) => ({
              ...s,
              done: isSuccess,
            }))}
            activeStage={activeStage}
          />
          {isUploading && (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[30%] animate-pulse rounded-full bg-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Processing file through AI pipeline…</p>
            </>
          )}
          {isSuccess && (
            <p className="text-xs text-success font-medium">Pipeline complete. Check Upload History for results.</p>
          )}
          {!isUploading && !isSuccess && (
            <p className="text-xs text-muted-foreground">Upload a file to start the pipeline.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
