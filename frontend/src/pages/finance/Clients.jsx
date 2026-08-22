import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function Clients() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    finance.clients().then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-4">
        <div className="section-title">{data.total} Clients</div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Client Name</th>
                <th>Email</th>
                <th>Employees</th>
                <th>Documents</th>
                <th>Invoices</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: "var(--gray-400)" }}>#{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.email || <span className="text-muted">—</span>}</td>
                  <td>{c.employee_count}</td>
                  <td>{c.document_count}</td>
                  <td>{c.invoice_count}</td>
                  <td><Badge value={c.is_active ? "active" : "inactive"} /></td>
                  <td>
                    <button className="btn-ghost" onClick={() => navigate(`/finance/clients/${c.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={8} className="empty-state">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
