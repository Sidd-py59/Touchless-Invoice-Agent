import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portal } from "../../api";
import Badge from "../../components/Badge";

export default function PortalInvoices() {
  const { clientId } = useParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    portal.invoices(clientId, { page, page_size: 20 }).then((r) => {
      setItems(r.data.items);
      setTotal(r.data.total);
    });
  }, [clientId, page]);

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-4">
        <div className="section-title">My Invoices</div>
        <span className="text-muted">{total} total</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Billing Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Generated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                  <td>{inv.billing_period}</td>
                  <td style={{ fontWeight: 600 }}>{inv.currency} {Number(inv.grand_total).toLocaleString()}</td>
                  <td><Badge value={inv.status} /></td>
                  <td>{new Date(inv.generated_at).toLocaleDateString()}</td>
                  <td>
                    {inv.has_pdf && (
                      <a href={portal.downloadInvoice(clientId, inv.id)} target="_blank" rel="noreferrer">
                        <button className="btn-ghost">Download</button>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No invoices yet</td></tr>
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
