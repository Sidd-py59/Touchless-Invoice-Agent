import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, Download, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { api, fmtAmount } from "@/lib/api";
import { payrollStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/admin/payroll-queue/$id")({
  head: () => ({
    meta: [
      { title: "Payroll Details | TIA" },
      {
        name: "description",
        content: "Inspect source payroll, AI extraction JSON, validation timeline, and invoice preview.",
      },
    ],
  }),
  component: PayrollDetailsPage,
});

function PayrollDetailsPage() {
  const { id } = Route.useParams();
  const tsId = Number(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: ts, isLoading, error } = useQuery({
    queryKey: ["timesheet", tsId],
    queryFn: () => api.getTimesheet(tsId),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateInvoice(tsId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet", tsId] });
      toast.success(
        `Invoice ${data.invoice_number} created · ${fmtAmount(data.grand_total, data.currency)}`,
        { duration: 5000 }
      );
      navigate({ to: "/admin/invoices" });
    },
    onError: (err: Error) => {
      toast.error(`Invoice generation failed: ${err.message}`);
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading timesheet…</div>;
  }

  if (error || !ts) {
    return <div className="p-8 text-center text-sm text-destructive">Failed to load timesheet.</div>;
  }

  const failedValidations = ts.entries.flatMap((e) =>
    e.validation_results.filter((v) => v.status === "failed" && !v.resolved)
  );

  const canGenerateInvoice = ts.status !== "draft" && ts.status !== "processing";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageTitle
          title={`${ts.client_name} · ${ts.billing_period}`}
          description="Timesheet details, validation outcomes, and invoice generation."
        />
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" asChild>
            <a href={api.timesheetExportUrl(tsId)} download>
              <Download className="h-4 w-4" />
              SAP Excel
            </a>
          </Button>
          <Button
            disabled={!canGenerateInvoice || generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            <FileText className="h-4 w-4" />
            {generateMutation.isPending ? "Generating…" : "Generate Invoice"}
          </Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Timesheet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-2">
                  <StatusPill label={ts.status} tone={payrollStatusTone(ts.status)} />
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{ts.entries.length}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Billing Period</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{ts.billing_period}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Validation Errors</p>
                <p className={`mt-2 text-sm font-semibold ${failedValidations.length > 0 ? "text-destructive" : "text-foreground"}`}>
                  {failedValidations.length}
                </p>
              </div>
            </div>

            {failedValidations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Unresolved Validation Issues</p>
                {failedValidations.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    <span className="text-foreground">{v.message}</span>
                  </div>
                ))}
              </div>
            )}

            {failedValidations.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-xs">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span className="text-foreground">All validation checks passed</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Employee Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Employee</th>
                    <th className="pb-2 pr-3 text-right">Days</th>
                    <th className="pb-2 pr-3 text-right">OT Hrs</th>
                    <th className="pb-2 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {ts.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50">
                      <td className="py-1.5 pr-3 font-medium text-foreground">
                        {entry.raw_employee_name ?? entry.raw_employee_code ?? `EMP-${entry.employee_id}`}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-muted-foreground">
                        {Number(entry.working_days).toFixed(1)}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-muted-foreground">
                        {Number(entry.ot_hours).toFixed(1)}
                      </td>
                      <td className={`py-1.5 text-right font-medium ${entry.confidence >= 0.9 ? "text-success" : entry.confidence >= 0.7 ? "text-warning" : "text-destructive"}`}>
                        {(entry.confidence * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                  {ts.entries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        No entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
