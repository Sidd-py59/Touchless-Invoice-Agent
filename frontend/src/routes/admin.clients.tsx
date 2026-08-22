import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Plus, Users } from "lucide-react";
import { useState } from "react";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type CreateClientRequest } from "@/lib/api";

export const Route = createFileRoute("/admin/clients")({
  head: () => ({
    meta: [
      { title: "Clients | TIA" },
      { name: "description", content: "Manage client accounts and billing configuration." },
    ],
  }),
  component: ClientsPage,
});

const EMPTY_FORM: CreateClientRequest = { name: "", email: "", billing_address: "", city: "", industry: "" };

function ClientsPage() {
  const location = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateClientRequest>(EMPTY_FORM);

  const { data, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.listClients(),
  });

  const mutation = useMutation({
    mutationFn: (body: CreateClientRequest) => api.createClient(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  if (location.pathname !== "/admin/clients") {
    return <Outlet />;
  }

  function field(key: keyof CreateClientRequest, label: string, placeholder?: string) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <Input
          className="h-8 text-sm"
          placeholder={placeholder ?? label}
          value={form[key] ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <PageTitle
          title="Clients"
          description="Review active client operations, payroll scale, and billing performance."
        />
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Client
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            Client list
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
              <TableHead className="h-9 text-xs font-semibold">Employees</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Documents</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Invoices</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
              <TableHead className="h-9 text-xs font-semibold">Action</TableHead>
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
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">Failed to load clients.</TableCell>
              </TableRow>
            )}
            {data?.items.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No clients yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Click "New Client" to add one.</p>
                </TableCell>
              </TableRow>
            )}
            {(data?.items ?? []).map((client) => (
              <TableRow key={client.id}>
                <TableCell className="py-3">
                  <div>
                    <p className="font-semibold text-foreground">{client.name}</p>
                    {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                  </div>
                </TableCell>
                <TableCell className="py-3 tabular-nums">{client.employee_count}</TableCell>
                <TableCell className="py-3 tabular-nums">{client.document_count}</TableCell>
                <TableCell className="py-3 tabular-nums">{client.invoice_count}</TableCell>
                <TableCell className="py-3">
                  <StatusPill label={client.is_active ? "Active" : "Inactive"} tone={client.is_active ? "success" : "neutral"} raw />
                </TableCell>
                <TableCell className="py-3">
                  <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Link to="/admin/clients/$id" params={{ id: String(client.id) }}>
                      Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Client dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add new client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {field("name", "Client Name *", "Emirates Steel Industries LLC")}
            {field("email", "Billing Email", "billing@client.com")}
            {field("city", "City", "Dubai")}
            {field("industry", "Industry", "Construction")}
            {field("billing_address", "Billing Address", "PO Box 12345, Dubai, UAE")}
          </div>
          {mutation.error && (
            <p className="text-xs text-destructive">{String(mutation.error)}</p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!form.name.trim() || mutation.isPending}
              onClick={() => mutation.mutate(form)}
            >
              {mutation.isPending ? "Saving…" : "Create client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
