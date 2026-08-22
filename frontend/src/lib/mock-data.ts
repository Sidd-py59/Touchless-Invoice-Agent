import { Upload, AlertTriangle, CheckCircle, FileText, Send } from "lucide-react";
import type { KPIStat, PipelineStage, TimelineItem, PayrollQueueItem, InvoiceItem, HumanReviewItem, DispatchItem, ClientItem, UploadHistoryItem } from "./types";

/* ── Admin Dashboard ────────────────────────── */

export const adminDashboardStats: KPIStat[] = [
  { label: "Uploads Today", value: "24", hint: "vs yesterday", icon: Upload, status: "info" },
  { label: "Pending Review", value: "3", hint: "2 from last hour", icon: AlertTriangle, status: "warning" },
  { label: "Validated", value: "18", icon: CheckCircle, status: "success" },
  { label: "Invoices Generated", value: "15", icon: FileText, status: "info" },
  { label: "Dispatch Ready", value: "12", icon: Send, status: "success" },
];

export const adminPipelineStages: PipelineStage[] = [
  { label: "Upload", done: true },
  { label: "Parse", done: true },
  { label: "Normalize", done: true },
  { label: "Validate", done: true },
  { label: "Invoice", count: 5 },
  { label: "Dispatch", count: 6 },
];

export const recentAdminActivity: TimelineItem[] = [
  { id: "1", title: "Invoice INV-004 Generated", description: "Acme Corp Q1 Payroll", time: "10 mins ago" },
  { id: "2", title: "Payroll validated", description: "GlobalTech May payroll", time: "25 mins ago" },
  { id: "3", title: "Review escalated", description: "Delta Inc overtime anomaly", time: "1 hour ago" },
];

/* ── Payroll Queue ──────────────────────────── */

export const payrollQueue: PayrollQueueItem[] = [
  { id: "pq-1", client: "Acme Corp", document: "acme_may_2026.xlsx", source: "Email", status: "Review Required", confidence: "74%", uploadedAt: "2026-06-27 09:12" },
  { id: "pq-2", client: "GlobalTech", document: "globaltech_may_payroll.csv", source: "Portal", status: "Complete", confidence: "98%", uploadedAt: "2026-06-27 08:45" },
  { id: "pq-3", client: "Delta Inc", document: "delta_overtime_report.pdf", source: "Email", status: "In Progress", confidence: "82%", uploadedAt: "2026-06-27 08:30" },
  { id: "pq-4", client: "Nexus Systems", document: "nexus_payroll_june.xlsx", source: "Portal", status: "Validated", confidence: "96%", uploadedAt: "2026-06-26 17:00" },
  { id: "pq-5", client: "Orion Energy", document: "orion_may_staff.csv", source: "Email", status: "Error", confidence: "34%", uploadedAt: "2026-06-26 15:20" },
];

/* ── Human Review Items ─────────────────────── */

export const humanReviewItems: HumanReviewItem[] = [
  { id: "hr-1", client: "Acme Corp", issue: "Overtime hours exceed 30% cap defined in contract", severity: "High", confidence: "74%", recommendedAction: "Compare against signed contract terms" },
  { id: "hr-2", client: "Delta Inc", issue: "Missing employee IDs for 12 rows", severity: "Critical", confidence: "42%", recommendedAction: "Request updated payroll file from client" },
  { id: "hr-3", client: "Orion Energy", issue: "Duplicate entry detected for EMP-4421", severity: "Medium", confidence: "61%", recommendedAction: "Verify with HR records" },
];

/* ── Invoices ───────────────────────────────── */

export const invoices: InvoiceItem[] = [
  { id: "inv-1", invoiceNumber: "INV-001", client: "Acme Corp", month: "May 2026", amount: "$45,200", status: "Generated", dispatchStatus: "Delivered" },
  { id: "inv-2", invoiceNumber: "INV-002", client: "GlobalTech", month: "May 2026", amount: "$128,750", status: "Approved", dispatchStatus: "Sent" },
  { id: "inv-3", invoiceNumber: "INV-003", client: "Delta Inc", month: "May 2026", amount: "$67,300", status: "Pending Review", dispatchStatus: "Queued" },
  { id: "inv-4", invoiceNumber: "INV-004", client: "Nexus Systems", month: "May 2026", amount: "$34,890", status: "Generated", dispatchStatus: "Sending" },
  { id: "inv-5", invoiceNumber: "INV-005", client: "Orion Energy", month: "Apr 2026", amount: "$91,420", status: "Rejected", dispatchStatus: "Failed" },
];

/* ── Dispatch Items ─────────────────────────── */

export const dispatchItems: DispatchItem[] = [
  {
    id: "d-1",
    invoiceNumber: "INV-001",
    client: "Acme Corp",
    status: "Delivered",
    timeline: [
      { label: "Queued", at: "09:00", status: "success" },
      { label: "Sending", at: "09:02", status: "success" },
      { label: "Delivered", at: "09:04", status: "success" },
    ],
  },
  {
    id: "d-2",
    invoiceNumber: "INV-003",
    client: "Delta Inc",
    status: "Queued",
    timeline: [
      { label: "Queued", at: "10:30", status: "warning" },
      { label: "Sending", at: "—", status: "neutral" },
      { label: "Delivered", at: "—", status: "neutral" },
    ],
  },
  {
    id: "d-3",
    invoiceNumber: "INV-005",
    client: "Orion Energy",
    status: "Failed",
    timeline: [
      { label: "Queued", at: "08:15", status: "success" },
      { label: "Sending", at: "08:17", status: "error" },
      { label: "Delivered", at: "—", status: "neutral" },
    ],
  },
];

/* ── Clients ────────────────────────────────── */

export const clients: ClientItem[] = [
  { id: "c-1", name: "Acme Corp", employees: 243, invoices: 12, revenue: "$542,400", status: "Active" },
  { id: "c-2", name: "GlobalTech", employees: 1280, invoices: 24, revenue: "$3,090,000", status: "Active" },
  { id: "c-3", name: "Delta Inc", employees: 97, invoices: 6, revenue: "$403,800", status: "At Risk" },
  { id: "c-4", name: "Nexus Systems", employees: 450, invoices: 18, revenue: "$627,900", status: "Active" },
  { id: "c-5", name: "Orion Energy", employees: 812, invoices: 9, revenue: "$822,780", status: "Inactive" },
];

/* ── Client Dashboard ───────────────────────── */

export const clientDashboardStats: KPIStat[] = [
  { label: "Uploads This Month", value: "8", status: "info" },
  { label: "Processing", value: "2", status: "warning" },
  { label: "Invoices Ready", value: "5", status: "success" },
  { label: "Pending Review", value: "1", status: "warning" },
];

export const recentClientActivity: TimelineItem[] = [
  { id: "ca-1", title: "Invoice INV-002 ready", description: "May 2026 payroll invoice generated", time: "2 hours ago" },
  { id: "ca-2", title: "Payroll uploaded", description: "june_payroll.xlsx submitted", time: "5 hours ago" },
  { id: "ca-3", title: "Validation complete", description: "May payroll passed all checks", time: "1 day ago" },
];

/* ── Upload History ─────────────────────────── */

export const uploadHistory: UploadHistoryItem[] = [
  { id: "uh-1", fileName: "may_payroll.xlsx", uploadDate: "2026-06-01", status: "Complete", confidence: "98%", invoice: "INV-002", remarks: "—" },
  { id: "uh-2", fileName: "april_payroll.csv", uploadDate: "2026-05-02", status: "Complete", confidence: "95%", invoice: "INV-001", remarks: "—" },
  { id: "uh-3", fileName: "march_payroll.xlsx", uploadDate: "2026-04-01", status: "Review Required", confidence: "72%", invoice: "—", remarks: "Overtime anomaly flagged" },
  { id: "uh-4", fileName: "feb_payroll_v2.xlsx", uploadDate: "2026-03-03", status: "Complete", confidence: "99%", invoice: "INV-009", remarks: "Resubmission accepted" },
];

/* ── Upload Pipeline Stages ─────────────────── */

export const uploadPipelineStages: PipelineStage[] = [
  { label: "Upload", done: true },
  { label: "Parsing", done: true },
  { label: "Normalizing", done: true },
  { label: "Validating", done: true },
  { label: "Generating Invoice", count: 1 },
];

/* ── Analytics series ───────────────────────── */

export const analyticsSeries = {
  invoicesGenerated: [
    { month: "Jan", value: 28 },
    { month: "Feb", value: 34 },
    { month: "Mar", value: 31 },
    { month: "Apr", value: 42 },
    { month: "May", value: 38 },
    { month: "Jun", value: 45 },
  ],
  processingAndAccuracy: [
    { week: "W1", processingTime: 4.2, aiAccuracy: 91 },
    { week: "W2", processingTime: 3.8, aiAccuracy: 93 },
    { week: "W3", processingTime: 3.5, aiAccuracy: 94 },
    { week: "W4", processingTime: 3.1, aiAccuracy: 95 },
    { week: "W5", processingTime: 3.0, aiAccuracy: 96 },
  ],
};
