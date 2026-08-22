import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Inbox } from "lucide-react";
import { PageTitle } from "@/components/app/page-title";
import { SearchFilterBar } from "@/components/app/search-filter-bar";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { payrollStatusTone } from "@/lib/ui-mappers";

export const Route = createFileRoute("/admin/payroll-queue")({
  head: () => ({
    meta: [
      { title: "Payroll Queue | TIA" },
      { name: "description", content: "Operational queue for payroll documents with confidence and review actions." },
    ],
  }),
  component: PayrollQueuePage,
});

function PayrollQueuePage() {
  const location = useLocation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => api.listTimesheets({ page_size: 50 }),
  });

  if (location.pathname !== "/admin/payroll-queue") {
    return <Outlet />;
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title="Payroll Queue"
        description="Manage incoming payroll documents, inspect confidence scores, and generate invoices."
      />

      <SearchFilterBar placeholder="Search client or period" />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            Queue
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
              <TableHead className="h-9 text-xs font-semibold">Client</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Period</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Entries</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Errors</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Created</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">Failed to load timesheets.</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center">
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No timesheets yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">Timesheets appear here once a client uploads a payroll file.</p>
                </TableCell>
              </TableRow>
            )}
            {(data?.items ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="py-3 font-medium text-foreground">{item.client_name}</TableCell>
                <TableCell className="py-3 text-muted-foreground">{item.billing_period}</TableCell>
                <TableCell className="py-3">
                  <StatusPill label={item.status} tone={payrollStatusTone(item.status)} />
                </TableCell>
                <TableCell className="py-3 tabular-nums text-muted-foreground">{item.entry_count}</TableCell>
                <TableCell className={`py-3 tabular-nums font-medium ${item.error_count > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {item.error_count > 0 ? item.error_count : "—"}
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="py-3">
                  <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
                    <Link to="/admin/payroll-queue/$id" params={{ id: String(item.id) }}>
                      Open
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
