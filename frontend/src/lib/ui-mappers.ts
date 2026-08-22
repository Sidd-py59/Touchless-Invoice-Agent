import type { Tone } from "@/components/app/status-pill";

export function payrollStatusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case "complete":
    case "validated":
    case "approved":
    case "invoiced":
      return "success";
    case "review required":
    case "in progress":
    case "processing":
    case "validation_pending":
      return "warning";
    case "failed":
    case "error":
    case "cancelled":
      return "error";
    case "draft":
      return "neutral";
    default:
      return "info";
  }
}

export function invoiceStatusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case "generated":
    case "approved":
    case "sent":
      return "success";
    case "pending review":
    case "draft":
      return "warning";
    case "rejected":
    case "cancelled":
      return "error";
    default:
      return "info";
  }
}

export function dispatchStatusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case "delivered":
    case "sent":
      return "success";
    case "queued":
    case "sending":
    case "generated":
      return "warning";
    case "failed":
      return "error";
    default:
      return "info";
  }
}

export function severityTone(severity: string): Tone {
  switch (severity.toLowerCase()) {
    case "critical":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "neutral";
    default:
      return "info";
  }
}
