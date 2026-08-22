import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function Invoices() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = { page, page_size: 20 };
    if (statusFilter) params.status = statusFilter;
    finance.invoices(params).then((r) => { setItems(r.data.items); setTotal(r.data.total); });
  }, [page, statusFilter]);

  return (
    <div className="page">
      <div className="filters">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <span className="text-muted" style={{ marginLeft: "auto" }}>{total} invoices</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Billing Period</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Generated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                  <td>{inv.client_name}</td>
                  <td>{inv.billing_period}</td>
                  <td style={{ fontWeight: 600 }}>{inv.currency} {Number(inv.grand_total).toLocaleString()}</td>
                  <td><Badge value={inv.status} /></td>
                  <td><Badge value={inv.approval_status} /></td>
                  <td>{new Date(inv.generated_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-ghost" onClick={() => navigate(`/finance/invoices/${inv.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="empty-state">No invoices yet</td></tr>
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
