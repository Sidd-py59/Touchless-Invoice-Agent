export interface KPIStat {
  label: string;
  value: string;
  hint?: string;
  status?: "success" | "warning" | "info" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
}

export interface PipelineStage {
  label: string;
  count?: number;
  done?: boolean;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
}

export interface PayrollQueueItem {
  id: string;
  client: string;
  document: string;
  source: string;
  status: string;
  confidence: string;
  uploadedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  client: string;
  month: string;
  amount: string;
  status: string;
  dispatchStatus: string;
}

export interface HumanReviewItem {
  id: string;
  client: string;
  issue: string;
  severity: string;
  confidence: string;
  recommendedAction: string;
}

export interface DispatchItem {
  id: string;
  invoiceNumber: string;
  client: string;
  status: string;
  timeline: { label: string; at: string; status: string }[];
}

export interface ClientItem {
  id: string;
  name: string;
  employees: number;
  invoices: number;
  revenue: string;
  status: string;
}

export interface UploadHistoryItem {
  id: string;
  fileName: string;
  uploadDate: string;
  status: string;
  confidence: string;
  invoice: string;
  remarks: string;
}
