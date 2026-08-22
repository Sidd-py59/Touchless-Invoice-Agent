import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function ValidationQueue() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const load = () => {
    finance.validationQueue({ page: 1, page_size: 50 }).then((r) => {
      setItems(r.data.items);
      setTotal(r.data.total);
    });
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>Validation Queue</div>
          <div className="text-muted">{total} timesheets need review</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timesheet</th>
                <th>Client</th>
                <th>Billing Period</th>
                <th>Entries</th>
                <th>Errors</th>
                <th>Status</th>
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
                    {ts.error_count > 0 ? (
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>{ts.error_count} errors</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td><Badge value={ts.status} /></td>
                  <td>
                    <button className="btn-primary" onClick={() => navigate(`/finance/timesheets/${ts.id}`)}>
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="empty-state">✅ No items in validation queue</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
