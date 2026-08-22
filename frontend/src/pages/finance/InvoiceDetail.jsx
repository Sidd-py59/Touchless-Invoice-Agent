import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function InvoiceDetail() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = () => finance.invoice(id).then((r) => setInv(r.data));
  useEffect(() => { load(); }, [id]);

  const handleApprove = async () => {
    setLoading(true);
    await finance.approveInvoice(id);
    load();
    setLoading(false);
  };

  const handleSend = async () => {
    setLoading(true);
    await finance.sendInvoice(id);
    load();
    setLoading(false);
  };

  if (!inv) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>← Back</button>

      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="section-title">{inv.invoice_number}</div>
            <div className="flex gap-2 items-center mt-2">
              <Badge value={inv.status} />
              <Badge value={inv.approval_status} />
              <span className="text-muted">{inv.billing_period}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {inv.approval_status === "pending" && (
              <button className="btn-success" onClick={handleApprove} disabled={loading}>
                Approve
              </button>
            )}
            {inv.approval_status === "approved" && inv.status === "draft" && (
              <button className="btn-primary" onClick={handleSend} disabled={loading}>
                Mark as Sent
              </button>
            )}
            {inv.invoice_pdf_path && (
              <a href={finance.downloadInvoice(id)} target="_blank" rel="noreferrer">
                <button className="btn-ghost">Download PDF</button>
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-3" style={{ gap: 48 }}>
          <div>
            <div className="text-muted" style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Billed To</div>
            <div style={{ fontWeight: 600 }}>{inv.client_name}</div>
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Invoice Date</div>
            <div>{inv.invoice_date}</div>
          </div>
          <div>
            <div className="text-muted" style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Due Date</div>
            <div>{inv.due_date}</div>
          </div>
          {inv.approved_by && (
            <div>
              <div className="text-muted" style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Approved By</div>
              <div>{inv.approved_by}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-4" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th style={{ textAlign: "right" }}>Gross Salary</th>
                <th style={{ textAlign: "right" }}>OT Pay</th>
                <th style={{ textAlign: "right" }}>Deductions</th>
                <th style={{ textAlign: "right" }}>Bill Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item) => (
                <tr key={item.id}>
                  <td>Employee #{item.employee_id}</td>
                  <td style={{ textAlign: "right" }}>{inv.currency} {Number(item.gross_salary).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>{inv.currency} {Number(item.ot_amount).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>-{inv.currency} {Number(item.deduction).toLocaleString()}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{inv.currency} {Number(item.bill_amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 360, marginLeft: "auto" }}>
        {[
          ["Subtotal", inv.subtotal],
          ["Service Charge", inv.service_charge],
          ["Tax", inv.tax],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--gray-100)" }}>
            <span className="text-muted">{label}</span>
            <span>{inv.currency} {Number(val).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between" style={{ padding: "10px 0", fontWeight: 700, fontSize: 16 }}>
          <span>Grand Total</span>
          <span style={{ color: "var(--brand)" }}>{inv.currency} {Number(inv.grand_total).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
