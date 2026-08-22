import axios from "axios";

const BASE = "http://localhost:8000/api/v1";

const api = axios.create({ baseURL: BASE });

// Finance Dashboard
export const finance = {
  overview: () => api.get("/finance/overview"),
  documents: (params) => api.get("/finance/documents", { params }),
  document: (id) => api.get(`/finance/documents/${id}`),
  timesheets: (params) => api.get("/finance/timesheets", { params }),
  timesheet: (id) => api.get(`/finance/timesheets/${id}`),
  validationQueue: (params) => api.get("/finance/validation-queue", { params }),
  resolveValidation: (id) => api.put(`/finance/validation/${id}/resolve`),
  generateInvoice: (timesheetId) => api.post(`/finance/timesheets/${timesheetId}/invoice`),
  invoices: (params) => api.get("/finance/invoices", { params }),
  invoice: (id) => api.get(`/finance/invoices/${id}`),
  approveInvoice: (id) => api.put(`/finance/invoices/${id}/approve`),
  sendInvoice: (id) => api.put(`/finance/invoices/${id}/send`),
  downloadInvoice: (id) => `${BASE}/finance/invoices/${id}/download`,
  clients: (params) => api.get("/finance/clients", { params }),
  client: (id) => api.get(`/finance/clients/${id}`),
};

// Client Portal
export const portal = {
  overview: (clientId) => api.get(`/portal/${clientId}/overview`),
  invoices: (clientId, params) => api.get(`/portal/${clientId}/invoices`, { params }),
  downloadInvoice: (clientId, invoiceId) => `${BASE}/portal/${clientId}/invoices/${invoiceId}/download`,
  documents: (clientId, params) => api.get(`/portal/${clientId}/documents`, { params }),
  upload: (clientId, formData) =>
    api.post(`/portal/${clientId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// Ingestion (Finance upload)
export const ingestion = {
  upload: (formData) =>
    api.post("/ingestion/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
