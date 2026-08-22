import { useEffect, useState } from "react";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    finance.overview().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Documents</div>
          <div className="stat-value">{data.total_documents}</div>
          <div className="stat-sub">{data.documents_this_month} this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Validation</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>{data.pending_validation}</div>
          <div className="stat-sub">Require review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Validated</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{data.validated}</div>
          <div className="stat-sub">Ready to invoice</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Invoices Generated</div>
          <div className="stat-value">{data.invoices_generated}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            AED {Number(data.total_revenue).toLocaleString()}
          </div>
          <div className="stat-sub">Invoiced amount</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Document Sources</div>
        <div className="flex gap-3" style={{ flexWrap: "wrap", marginTop: 8 }}>
          {data.source_breakdown.map((s) => (
            <div key={s.source} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--gray-50)", borderRadius: "var(--radius)", border: "1px solid var(--gray-200)" }}>
              <Badge value={s.source} />
              <span style={{ fontWeight: 600 }}>{s.count}</span>
            </div>
          ))}
          {data.source_breakdown.length === 0 && <span className="text-muted">No documents yet</span>}
        </div>
      </div>
    </div>
  );
}
