import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { finance } from "../../api";

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    finance.client(id).then((r) => setClient(r.data));
  }, [id]);

  if (!client) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>← Back</button>

      <div className="card mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="section-title">{client.name}</div>
            {client.email && <div className="text-muted" style={{ marginTop: 4 }}>{client.email}</div>}
            {client.billing_address && <div className="text-muted" style={{ marginTop: 4 }}>{client.billing_address}</div>}
          </div>
          <button className="btn-primary" onClick={() => navigate(`/portal/${id}`)}>
            View Client Portal →
          </button>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: "Total Revenue", value: `AED ${Number(client.total_revenue).toLocaleString()}` },
          { label: "Employees", value: client.employee_count },
          { label: "Documents", value: client.document_count },
          { label: "Invoices", value: client.invoice_count },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => navigate(`/finance/documents?client_id=${id}`)}>
          View Documents
        </button>
        <button className="btn-ghost" onClick={() => navigate(`/finance/invoices?client_id=${id}`)}>
          View Invoices
        </button>
      </div>
    </div>
  );
}
