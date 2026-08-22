import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCircle, Save } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/app/page-title";
import { StatusPill } from "@/components/app/status-pill";
import { api, fmtAmount, type CreateEmployeeRequest, type UpdateClientConfigRequest } from "@/lib/api";

export const Route = createFileRoute("/admin/clients/$id")({
  head: () => ({
    meta: [{ title: "Client Profile | TIA" }],
  }),
  component: ClientProfilePage,
});

const EMPTY_EMP: CreateEmployeeRequest = {
  employee_code: "", first_name: "", last_name: "", email: "",
  basic_salary: 0, housing: 0, transport: 0, food: 0, phone: 0,
  deduction: 0, ot_rate_per_hour: 0, currency: "AED",
};

function ClientProfilePage() {
  const { id } = Route.useParams();
  const clientId = Number(id);
  const qc = useQueryClient();
  const [empOpen, setEmpOpen] = useState(false);
  const [empForm, setEmpForm] = useState<CreateEmployeeRequest>(EMPTY_EMP);

  const { data: client, isLoading, error } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => api.getClient(clientId),
  });

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ["employees", clientId],
    queryFn: () => api.listEmployees(clientId),
  });

  const { data: configData } = useQuery({
    queryKey: ["clientConfig", clientId],
    queryFn: () => api.getClientConfig(clientId),
  });

  const [configForm, setConfigForm] = useState<UpdateClientConfigRequest>({});

  useEffect(() => {
    if (configData) {
      setConfigForm({
        currency: configData.currency,
        service_charge_percentage: parseFloat(configData.service_charge_percentage),
        tax_percentage: parseFloat(configData.tax_percentage),
        invoice_prefix: configData.invoice_prefix,
        brand_color: configData.brand_color,
        payment_terms_days: configData.payment_terms_days,
        invoice_notes: configData.invoice_notes ?? "",
        logo_url: configData.logo_url ?? "",
      });
    }
  }, [configData]);

  const saveConfig = useMutation({
    mutationFn: () => api.updateClientConfig(clientId, {
      ...configForm,
      invoice_notes: configForm.invoice_notes || null,
      logo_url: configForm.logo_url || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientConfig", clientId] });
      toast.success("Invoice configuration saved.");
    },
    onError: () => toast.error("Failed to save configuration."),
  });

  const addEmp = useMutation({
    mutationFn: (body: CreateEmployeeRequest) => api.createEmployee(clientId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees", clientId] });
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEmpOpen(false);
      setEmpForm(EMPTY_EMP);
    },
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading client…</div>;
  if (error || !client) return <div className="p-8 text-center text-sm text-destructive">Failed to load client.</div>;

  function numField(key: keyof CreateEmployeeRequest, label: string) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <Input
          type="number"
          className="h-8 text-sm"
          placeholder="0"
          value={empForm[key] as number}
          onChange={(e) => setEmpForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
        />
      </div>
    );
  }

  function txtField(key: keyof CreateEmployeeRequest, label: string, placeholder?: string) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <Input
          className="h-8 text-sm"
          placeholder={placeholder ?? label}
          value={empForm[key] as string}
          onChange={(e) => setEmpForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      </div>
    );
  }

  const canSubmit =
    empForm.employee_code.trim() &&
    empForm.first_name.trim() &&
    empForm.last_name.trim() &&
    empForm.basic_salary > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <PageTitle
          title={client.name}
          description={client.email ?? "Client profile, employees, and invoice configuration."}
        />
        <StatusPill label={client.is_active ? "Active" : "Inactive"} tone={client.is_active ? "success" : "neutral"} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">
            Employees
            {empData && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {empData.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoice">Invoice Config</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Account summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Employees", value: client.employee_count },
                { label: "Documents", value: client.document_count },
                { label: "Invoices", value: client.invoice_count },
                { label: "Total Revenue", value: fmtAmount(client.total_revenue) },
              ].map((s) => (
                <div key={s.label} className="rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          {client.billing_address && (
            <Card className="border-border/80 shadow-sm mt-4">
              <CardHeader><CardTitle className="text-base">Billing Address</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{client.billing_address}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Employees tab */}
        <TabsContent value="employees">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">
                Employees
                {empData && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {empData.total}
                  </span>
                )}
              </p>
              <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setEmpOpen(true)}>
                <Plus className="h-3 w-3" />
                Add Employee
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs font-semibold">Emp ID</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Name</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Email</TableHead>
                  <TableHead className="h-9 text-xs font-semibold text-right">Basic Salary</TableHead>
                  <TableHead className="h-9 text-xs font-semibold text-right">Allowance</TableHead>
                  <TableHead className="h-9 text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                )}
                {empData?.items.length === 0 && !empLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <UserCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">No employees yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Click "Add Employee" to create one.</p>
                    </TableCell>
                  </TableRow>
                )}
                {(empData?.items ?? []).map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="py-3 font-mono text-xs text-muted-foreground">{emp.employee_code}</TableCell>
                    <TableCell className="py-3 font-medium">{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell className="py-3 text-xs text-muted-foreground">{emp.email ?? "—"}</TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-sm">
                      {emp.basic_salary ? fmtAmount(emp.basic_salary) : "—"}
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-sm">
                      {emp.allowance ? fmtAmount(emp.allowance) : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusPill label={emp.is_active ? "Active" : "Inactive"} tone={emp.is_active ? "success" : "neutral"} raw />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Invoice Config tab */}
        <TabsContent value="invoice">
          <div className="space-y-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader><CardTitle className="text-base">Billing &amp; fees</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Currency</label>
                  <Input
                    className="h-8 text-sm"
                    value={configForm.currency ?? ""}
                    onChange={(e) => setConfigForm((f) => ({ ...f, currency: e.target.value }))}
                    placeholder="AED"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Invoice Prefix</label>
                  <Input
                    className="h-8 text-sm"
                    value={configForm.invoice_prefix ?? ""}
                    onChange={(e) => setConfigForm((f) => ({ ...f, invoice_prefix: e.target.value }))}
                    placeholder="INV"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Service Charge %</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={configForm.service_charge_percentage ?? 0}
                    onChange={(e) => setConfigForm((f) => ({ ...f, service_charge_percentage: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Tax / VAT %</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={configForm.tax_percentage ?? 0}
                    onChange={(e) => setConfigForm((f) => ({ ...f, tax_percentage: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Payment Terms (days)</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={configForm.payment_terms_days ?? 30}
                    onChange={(e) => setConfigForm((f) => ({ ...f, payment_terms_days: parseInt(e.target.value) || 30 }))}
                    placeholder="30"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader><CardTitle className="text-base">Invoice appearance</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-8 w-12 cursor-pointer rounded p-0.5"
                      value={configForm.brand_color ?? "#1a56db"}
                      onChange={(e) => setConfigForm((f) => ({ ...f, brand_color: e.target.value }))}
                    />
                    <Input
                      className="h-8 flex-1 font-mono text-sm"
                      value={configForm.brand_color ?? "#1a56db"}
                      onChange={(e) => setConfigForm((f) => ({ ...f, brand_color: e.target.value }))}
                      placeholder="#1a56db"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Logo URL (optional)</label>
                  <Input
                    className="h-8 text-sm"
                    value={configForm.logo_url ?? ""}
                    onChange={(e) => setConfigForm((f) => ({ ...f, logo_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground">Custom Notes (appears on every invoice)</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={3}
                    value={configForm.invoice_notes ?? ""}
                    onChange={(e) => setConfigForm((f) => ({ ...f, invoice_notes: e.target.value }))}
                    placeholder="e.g. Please transfer to IBAN: AE... · Bank: Emirates NBD"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-1.5"
                disabled={saveConfig.isPending}
                onClick={() => saveConfig.mutate()}
              >
                <Save className="h-3.5 w-3.5" />
                {saveConfig.isPending ? "Saving…" : "Save Configuration"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Employee dialog */}
      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Add employee to {client.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              {txtField("employee_code", "Employee ID *", "EMP10001")}
              {txtField("email", "Email", "emp@tasc.com")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {txtField("first_name", "First Name *", "Carlos")}
              {txtField("last_name", "Last Name *", "Smith")}
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salary (AED/month)</p>
              <div className="grid grid-cols-3 gap-3">
                {numField("basic_salary", "Basic *")}
                {numField("housing", "Housing")}
                {numField("transport", "Transport")}
                {numField("food", "Food")}
                {numField("phone", "Phone")}
                {numField("deduction", "Deduction")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {numField("ot_rate_per_hour", "OT Rate/Hour")}
            </div>
          </div>
          {addEmp.error && (
            <p className="text-xs text-destructive">{String(addEmp.error)}</p>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEmpOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!canSubmit || addEmp.isPending}
              onClick={() => addEmp.mutate(empForm)}
            >
              {addEmp.isPending ? "Saving…" : "Add employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
