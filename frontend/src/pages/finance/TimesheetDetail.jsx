import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function TimesheetDetail() {
  const { id } = useParams();
  const [ts, setTs] = useState(null);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  const load = () => finance.timesheet(id).then((r) => setTs(r.data));
  useEffect(() => { load(); }, [id]);

  const handleGenerateInvoice = async () => {
    setGenerating(true);
    try {
      const r = await finance.generateInvoice(id);
      alert(`Invoice created: ${r.data.invoice_number}`);
      load();
      navigate(`/finance/invoices`);
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to generate invoice");
    } finally {
      setGenerating(false);
    }
  };

  const handleResolve = async (resultId) => {
    await finance.resolveValidation(resultId);
    load();
  };

  if (!ts) return <div className="page"><div className="spinner" /></div>;

  const canInvoice = ts.status !== "draft" && ts.status !== "processing";

  return (
    <div className="page">
      <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>← Back</button>

      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>
            Timesheet #{ts.id} — {ts.client_name}
          </div>
          <div className="flex gap-2 items-center">
            <Badge value={ts.status} />
            <span className="text-muted">{ts.billing_period}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canInvoice && (
            <button className="btn-success" onClick={handleGenerateInvoice} disabled={generating}>
              {generating ? "Generating..." : "Generate Invoice"}
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entry</th>
                <th>Emp ID</th>
                <th>Raw Name</th>
                <th>Raw Code</th>
                <th>Working Days</th>
                <th>OT Hours</th>
                <th>Leave Days</th>
                <th>Confidence</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {ts.entries.map((e) => {
                const errors = e.validation_results.filter((v) => v.status === "failed" && !v.resolved);
                return (
                  <tr key={e.id} style={{ background: errors.length ? "#fff8f8" : undefined }}>
                    <td style={{ color: "var(--gray-400)" }}>#{e.id}</td>
                    <td>{e.employee_id ?? <span className="text-muted">unresolved</span>}</td>
                    <td>{e.raw_employee_name || "—"}</td>
                    <td>{e.raw_employee_code || "—"}</td>
                    <td>{e.working_days}</td>
                    <td>{e.ot_hours}</td>
                    <td>{e.leave_days}</td>
                    <td>
                      <span style={{ color: e.confidence < 0.8 ? "var(--danger)" : "var(--success)" }}>
                        {(e.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      {e.validation_results.length === 0 && <span style={{ color: "var(--success)" }}>✓</span>}
                      {e.validation_results.map((v) => (
                        <div key={v.id} style={{ marginBottom: 4 }}>
                          <Badge value={v.severity} />
                          <span style={{ marginLeft: 6, fontSize: 12 }}>{v.rule_name}: {v.message}</span>
                          {!v.resolved && (
                            <button
                              style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px" }}
                              className="btn-ghost"
                              onClick={() => handleResolve(v.id)}
                            >
                              Resolve
                            </button>
                          )}
                          {v.resolved && <span style={{ marginLeft: 6, color: "var(--success)", fontSize: 11 }}>✓ resolved</span>}
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
              {ts.entries.length === 0 && (
                <tr><td colSpan={9} className="empty-state">No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
