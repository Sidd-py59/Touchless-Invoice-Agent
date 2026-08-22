import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ingestion } from "../../api";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    if (clientId) fd.append("client_id", clientId);

    try {
      const r = await ingestion.upload(fd);
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="section-title mb-4">Upload Document</div>

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <div
            className={`upload-zone ${drag ? "dragover" : ""}`}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
          >
            <input
              ref={inputRef}
              type="file"
              style={{ display: "none" }}
              accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.eml,.msg"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</div>
                <div className="text-muted">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 500 }}>Drop file here or click to browse</div>
                <div className="text-muted mt-4">Excel, PDF, Image, Email</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
              Client ID (optional — auto-detected if blank)
            </label>
            <input
              type="number"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 1"
              style={{ width: "100%" }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!file || loading}
            style={{ marginTop: 16, width: "100%" }}
          >
            {loading ? "Processing..." : "Upload & Parse"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#fee2e2", borderRadius: "var(--radius)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 16, padding: "16px", background: "#d1fae5", borderRadius: "var(--radius)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--success)" }}>✓ Document processed</div>
            <div style={{ fontSize: 13 }}>
              <div>Document ID: <strong>#{result.document_id}</strong></div>
              <div>Timesheet ID: <strong>#{result.timesheet_id}</strong></div>
              <div>Parser: <strong>{result.parser_name}</strong></div>
              <div>Confidence: <strong>{(result.confidence * 100).toFixed(0)}%</strong></div>
              {result.needs_review && <div style={{ color: "var(--warning)", marginTop: 4 }}>⚠ Needs review</div>}
            </div>
            <div className="flex gap-2" style={{ marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => navigate(`/finance/timesheets/${result.timesheet_id}`)}>
                View Timesheet →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
