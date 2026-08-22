import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, CheckCircle2, Send, FileText } from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtAmount } from "@/lib/api";
import { invoiceStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/admin/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices | TIA" },
      { name: "description", content: "Finance operations invoice list." },
    ],
  }),
  component: AdminInvoicesPage,
});

function AdminInvoicesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.listInvoices({ page_size: 50 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.approveInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => api.sendInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="Invoices"
        description="Review billing output, approve, and dispatch invoices to clients."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            Invoice Operations
            {data && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{data.total}</span>}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-xs font-semibold">Invoice</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Client</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Period</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Amount</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Approval</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading invoices…
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                  Failed to load invoices.
                </TableCell>
              </TableRow>
            )}
            {data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Generate invoices from validated timesheets in the Payroll Queue.</p>
                </TableCell>
              </TableRow>
            )}
            {(data?.items ?? []).map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="py-3 font-mono text-xs font-semibold text-foreground">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell className="py-3 font-medium">{invoice.client_name}</TableCell>
                <TableCell className="py-3 text-muted-foreground">{invoice.billing_period}</TableCell>
                <TableCell className="py-3 font-semibold tabular-nums">
                  {fmtAmount(invoice.grand_total, invoice.currency)}
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill label={invoice.status} tone={invoiceStatusTone(invoice.status)} />
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill
                    label={invoice.approval_status}
                    tone={invoice.approval_status === "approved" ? "success" : invoice.approval_status === "rejected" ? "error" : "warning"}
                  />
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-1.5">
                    {invoice.approval_status === "pending" && (
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(invoice.id)}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </Button>
                    )}
                    {invoice.approval_status === "approved" && invoice.status !== "sent" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        disabled={sendMutation.isPending}
                        onClick={() => sendMutation.mutate(invoice.id)}
                      >
                        <Send className="h-3 w-3" />
                        Send
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" asChild>
                      <a href={api.downloadInvoiceUrl(invoice.id)} target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3" />
                        PDF
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
