import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function DocumentDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    finance.document(id).then((r) => setDoc(r.data));
  }, [id]);

  if (!doc) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <button className="btn-ghost mb-4" onClick={() => navigate(-1)}>← Back</button>

      <div className="card mb-4">
        <div className="section-title">Document #{doc.id}</div>
        <table style={{ width: "auto" }}>
          <tbody>
            {[
              ["File Name", doc.file_name],
              ["Client", doc.client_name],
              ["Source", <Badge value={doc.source} />],
              ["Status", <Badge value={doc.status} />],
              ["MIME Type", doc.mime_type],
              ["Uploaded", new Date(doc.uploaded_at).toLocaleString()],
              ["Extractions", doc.extraction_count],
            ].map(([label, val]) => (
              <tr key={label}>
                <td style={{ padding: "6px 16px 6px 0", color: "var(--gray-600)", fontWeight: 500, whiteSpace: "nowrap" }}>{label}</td>
                <td style={{ padding: "6px 0" }}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {doc.timesheet_id && (
        <div className="card">
          <div className="section-title">Linked Timesheet</div>
          <div className="flex gap-3 items-center mt-4">
            <span>Timesheet #{doc.timesheet_id}</span>
            <Badge value={doc.timesheet_status} />
            <button
              className="btn-primary"
              onClick={() => navigate(`/finance/timesheets/${doc.timesheet_id}`)}
            >
              View Timesheet →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
