import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function Timesheets() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = { page, page_size: 20 };
    if (statusFilter) params.status = statusFilter;
    finance.timesheets(params).then((r) => { setItems(r.data.items); setTotal(r.data.total); });
  }, [page, statusFilter]);

  return (
    <div className="page">
      <div className="filters">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="validation_pending">Validation Pending</option>
          <option value="validated">Validated</option>
          <option value="approved">Approved</option>
          <option value="invoiced">Invoiced</option>
        </select>
        <span className="text-muted" style={{ marginLeft: "auto" }}>{total} timesheets</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Billing Period</th>
                <th>Entries</th>
                <th>Errors</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((ts) => (
                <tr key={ts.id}>
                  <td style={{ color: "var(--gray-400)" }}>#{ts.id}</td>
                  <td>{ts.client_name}</td>
                  <td>{ts.billing_period}</td>
                  <td>{ts.entry_count}</td>
                  <td>
                    {ts.error_count > 0
                      ? <span style={{ color: "var(--danger)", fontWeight: 600 }}>{ts.error_count}</span>
                      : <span style={{ color: "var(--success)" }}>✓</span>
                    }
                  </td>
                  <td><Badge value={ts.status} /></td>
                  <td>{new Date(ts.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-ghost" onClick={() => navigate(`/finance/timesheets/${ts.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="empty-state">No timesheets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="flex gap-2 mt-4 items-center">
          <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="text-muted">Page {page}</span>
          <button className="btn-ghost" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
