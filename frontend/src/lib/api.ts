const API_ORIGIN = "http://localhost:8000";
const BASE = `${API_ORIGIN}/api/v1`;

// Finance types

export interface FinanceOverview {
  total_documents: number;
  documents_this_month: number;
  pending_validation: number;
  validated: number;
  invoices_generated: number;
  total_revenue: string;
  source_breakdown: { source: string; count: number }[];
}

export interface TimesheetListItem {
  id: number;
  client_id: number;
  client_name: string;
  billing_period: string;
  status: string;
  entry_count: number;
  error_count: number;
  created_at: string;
}

export interface TimesheetListResponse {
  total: number;
  page: number;
  page_size: number;
  items: TimesheetListItem[];
}

export interface ValidationResultItem {
  id: number;
  rule_name: string;
  status: string;
  severity: string;
  message: string;
  expected: string | null;
  actual: string | null;
  resolved: boolean;
}

export interface TimesheetEntryItem {
  id: number;
  employee_id: number | null;
  raw_employee_code: string | null;
  raw_employee_name: string | null;
  working_days: string;
  ot_hours: string;
  leave_days: string;
  confidence: number;
  validation_results: ValidationResultItem[];
}

export interface TimesheetDetail {
  id: number;
  client_id: number;
  client_name: string;
  billing_period: string;
  status: string;
  document_id: number | null;
  entries: TimesheetEntryItem[];
}

export interface InvoiceListItem {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  billing_period: string;
  grand_total: string;
  currency: string;
  status: string;
  approval_status: string;
  generated_at: string;
}

export interface InvoiceListResponse {
  total: number;
  page: number;
  page_size: number;
  items: InvoiceListItem[];
}

export interface ClientListItem {
  id: number;
  name: string;
  email: string | null;
  is_active: boolean;
  employee_count: number;
  document_count: number;
  invoice_count: number;
}

export interface ClientListResponse {
  total: number;
  items: ClientListItem[];
}

export interface ClientDetail {
  id: number;
  name: string;
  email: string | null;
  billing_address: string | null;
  is_active: boolean;
  total_revenue: string;
  employee_count: number;
  document_count: number;
  invoice_count: number;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  billing_address?: string;
  city?: string;
  industry?: string;
}

export interface EmployeeListItem {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_active: boolean;
  basic_salary: string | null;
  allowance: string | null;
}

export interface EmployeeListResponse {
  total: number;
  items: EmployeeListItem[];
}

export interface CreateEmployeeRequest {
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string;
  basic_salary: number;
  housing?: number;
  transport?: number;
  food?: number;
  phone?: number;
  deduction?: number;
  ot_rate_per_hour?: number;
  currency?: string;
}

export interface GenerateInvoiceResponse {
  invoice_id: number;
  invoice_number: string;
  grand_total: string;
  currency: string;
  status: string;
}

export interface ClientConfig {
  id: number;
  client_id: number;
  currency: string;
  service_charge_percentage: string;
  tax_percentage: string;
  invoice_prefix: string;
  dispatch_method: string;
  validation_profile: string;
  brand_color: string;
  payment_terms_days: number;
  invoice_notes: string | null;
  logo_url: string | null;
}

export interface UpdateClientConfigRequest {
  currency?: string;
  service_charge_percentage?: number;
  tax_percentage?: number;
  invoice_prefix?: string;
  dispatch_method?: string;
  brand_color?: string;
  payment_terms_days?: number;
  invoice_notes?: string | null;
  logo_url?: string | null;
}

export interface AgentCommandResponse {
  intent: string;
  status: string;
  message: string;
  data: Record<string, unknown>;
  audio_url: string | null;
  audio_status: string;
  voice_provider: string | null;
  voice_error: string | null;
}

export interface VoicesResponse {
  voices: string[];
  default: string;
}

// Portal types

export interface PortalOverview {
  client_id: number;
  client_name: string;
  total_invoices: number;
  outstanding_amount: string;
  last_upload_at: string | null;
  pending_documents: number;
}

export interface PortalInvoiceListItem {
  id: number;
  invoice_number: string;
  billing_period: string;
  grand_total: string;
  currency: string;
  status: string;
  generated_at: string;
  has_pdf: boolean;
}

export interface PortalDocumentItem {
  id: number;
  file_name: string;
  source: string;
  status: string;
  uploaded_at: string;
}

export interface QueryListItem {
  id: number;
  client_id: number;
  client_name: string;
  invoice_id: number | null;
  subject: string;
  body: string;
  status: string;
  resolution_note: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface QueryListResponse {
  total: number;
  items: QueryListItem[];
}

export interface MonthlyCount {
  month: string;
  value: number;
}

export interface MonthlyAccuracy {
  week: string;
  aiAccuracy: number;
  processingTime: number;
}

export interface AnalyticsData {
  invoices_generated: MonthlyCount[];
  processing_and_accuracy: MonthlyAccuracy[];
}

// Helpers

import { getCachedToken, getFreshToken } from "@/lib/auth-storage";

type Params = Record<string, string | number | boolean | undefined>;

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getFreshToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// Plain <a href> downloads can't carry an Authorization header, so the backend
// also accepts the ID token as a ?token= query parameter.
function withToken(url: string): string {
  const token = getCachedToken();
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function get<T>(path: string, params?: Params): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: await authHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(body ? { "Content-Type": "application/json" } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: await authHeaders(body ? { "Content-Type": "application/json" } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export function fmtAmount(val: string | number, currency = "AED") {
  const n = Number(val);
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Finance API

export const api = {
  // Overview
  getFinanceOverview: () => get<FinanceOverview>("/finance/overview"),

  // Timesheets
  listTimesheets: (params?: { page?: number; page_size?: number; status?: string }) =>
    get<TimesheetListResponse>("/finance/timesheets", params),

  getTimesheet: (id: number) =>
    get<TimesheetDetail>(`/finance/timesheets/${id}`),

  getValidationQueue: (params?: { page?: number; page_size?: number }) =>
    get<TimesheetListResponse>("/finance/validation-queue", params),

  generateInvoice: (timesheetId: number) =>
    post<GenerateInvoiceResponse>(`/finance/timesheets/${timesheetId}/invoice`),

  // Invoices
  listInvoices: (params?: { page?: number; page_size?: number; status?: string }) =>
    get<InvoiceListResponse>("/finance/invoices", params),

  approveInvoice: (id: number) =>
    put<{ id: number; approval_status: string }>(`/finance/invoices/${id}/approve`),

  sendInvoice: (id: number) =>
    put<{ id: number; status: string }>(`/finance/invoices/${id}/send`),

  downloadInvoiceUrl: (id: number) => withToken(`${BASE}/finance/invoices/${id}/download`),

  // Clients
  listClients: () => get<ClientListResponse>("/finance/clients"),
  getClient: (id: number) => get<ClientDetail>(`/finance/clients/${id}`),
  createClient: (body: CreateClientRequest) => post<ClientDetail>("/finance/clients", body),
  getClientConfig: (clientId: number) => get<ClientConfig>(`/finance/clients/${clientId}/config`),
  updateClientConfig: (clientId: number, body: UpdateClientConfigRequest) =>
    put<ClientConfig>(`/finance/clients/${clientId}/config`, body),

  // Employees
  listEmployees: (clientId: number) => get<EmployeeListResponse>(`/finance/clients/${clientId}/employees`),
  createEmployee: (clientId: number, body: CreateEmployeeRequest) =>
    post<EmployeeListItem>(`/finance/clients/${clientId}/employees`, body),

  // Agent
  listVoices: () => get<VoicesResponse>("/agent/voices"),
  runAgentCommand: (text: string, voiceId?: string) =>
    post<AgentCommandResponse>("/agent/command", { text, voice_id: voiceId ?? null }),
  // /storage files (voice audio) are admin-gated; <audio src> can't send
  // headers, so the token rides along as a query param.
  mediaUrl: (path: string) =>
    withToken(path.startsWith("http") ? path : `${API_ORIGIN}${path}`),

  // Portal
  getPortalOverview: (clientId: number) =>
    get<PortalOverview>(`/portal/${clientId}/overview`),

  listPortalInvoices: (clientId: number, params?: { page?: number; page_size?: number }) =>
    get<{ total: number; items: PortalInvoiceListItem[] }>(`/portal/${clientId}/invoices`, params),

  listPortalDocuments: (clientId: number, params?: { page?: number; page_size?: number }) =>
    get<{ total: number; items: PortalDocumentItem[] }>(`/portal/${clientId}/documents`, params),

  portalDownloadUrl: (clientId: number, invoiceId: number) =>
    withToken(`${BASE}/portal/${clientId}/invoices/${invoiceId}/download`),

  uploadPortalFile: async (clientId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/portal/${clientId}/upload`, {
      method: "POST",
      headers: await authHeaders(),
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return res.json();
  },

  submitQuery: (clientId: number, body: { subject: string; body: string; invoice_id?: number }) =>
    post<{ id: number; status: string; message: string }>(`/portal/${clientId}/queries`, body),

  listClientQueries: (clientId: number) =>
    get<QueryListResponse>(`/portal/${clientId}/queries`),

  // Admin — queries
  listQueries: (params?: { status?: string }) =>
    get<QueryListResponse>("/finance/queries", params),

  resolveQuery: (queryId: number, body: { resolution_note: string; resolved_by?: string }) =>
    put<{ id: number; status: string }>(`/finance/queries/${queryId}/resolve`, body),

  // Analytics
  getAnalytics: () => get<AnalyticsData>("/finance/analytics"),

  // SAP Excel export
  timesheetExportUrl: (timesheetId: number) => withToken(`${BASE}/finance/timesheets/${timesheetId}/export`),
};

// Fallback client id for local development with AUTH_ENABLED=false. With auth
// on, client pages use the client_id custom claim from the Firebase token.
export const DEMO_CLIENT_ID = 1;
