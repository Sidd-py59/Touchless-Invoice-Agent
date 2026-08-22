import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, fmtAmount } from "@/lib/api";
import { useClientId } from "@/lib/auth-context";
import { invoiceStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/client/invoices")({
  head: () => ({
    meta: [
      { title: "My Invoices | TIA" },
      { name: "description", content: "Review generated invoices, download files, and preview invoice details." },
    ],
  }),
  component: ClientInvoicesPage,
});

function ClientInvoicesPage() {
  const clientId = useClientId();
  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-invoices-list", clientId],
    queryFn: () => api.listPortalInvoices(clientId, { page_size: 50 }),
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title="My Invoices"
        description="Track generated invoices and download invoice PDFs for verification."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            Invoices
            {data && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.total}
              </span>
            )}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 text-xs font-semibold">Invoice</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Period</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Amount</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Date</TableHead>
              <TableHead className="h-9 text-xs font-semibold">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">Failed to load invoices.</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">Invoices are generated automatically after your payroll files are processed.</p>
                </TableCell>
              </TableRow>
            )}
            {(data?.items ?? []).map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="py-3 font-mono text-xs font-semibold text-foreground">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">{invoice.billing_period}</TableCell>
                <TableCell className="py-3 font-semibold tabular-nums text-foreground">
                  {fmtAmount(invoice.grand_total, invoice.currency)}
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill label={invoice.status} tone={invoiceStatusTone(invoice.status)} />
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {new Date(invoice.generated_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="py-3">
                  {invoice.has_pdf ? (
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" asChild>
                      <a href={api.portalDownloadUrl(clientId, invoice.id)} target="_blank" rel="noreferrer">
                        <Download className="h-3 w-3" />
                        PDF
                      </a>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">Not ready</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
