import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portal } from "../../api";

export default function PortalOverview() {
  const { clientId } = useParams();
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    portal.overview(clientId).then((r) => setData(r.data));
  }, [clientId]);

  if (!data) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="section-title mb-6">Welcome, {data.client_name}</div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value">{data.total_invoices}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding Amount</div>
          <div className="stat-value" style={{ fontSize: 20, color: data.outstanding_amount > 0 ? "var(--warning)" : "var(--success)" }}>
            AED {Number(data.outstanding_amount).toLocaleString()}
          </div>
          <div className="stat-sub">Sent, awaiting payment</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Documents</div>
          <div className="stat-value">{data.pending_documents}</div>
          <div className="stat-sub">Being processed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Upload</div>
          <div className="stat-value" style={{ fontSize: 15, marginTop: 4 }}>
            {data.last_upload_at ? new Date(data.last_upload_at).toLocaleDateString() : "Never"}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => navigate(`/portal/${clientId}/upload`)}>
          Submit Timesheet
        </button>
        <button className="btn-ghost" onClick={() => navigate(`/portal/${clientId}/invoices`)}>
          View Invoices
        </button>
      </div>
    </div>
  );
}
