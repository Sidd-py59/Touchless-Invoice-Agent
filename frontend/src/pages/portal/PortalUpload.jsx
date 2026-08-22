import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portal } from "../../api";

export default function PortalUpload() {
  const { clientId } = useParams();
  const [file, setFile] = useState(null);
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

    try {
      const r = await portal.upload(clientId, fd);
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="section-title mb-4">Submit Attendance Timesheet</div>
      <div className="text-muted mb-6">
        Upload your attendance data. We support Excel, PDF, images, and email exports.
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <div
            className={`upload-zone ${drag ? "dragover" : ""}`}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              style={{ display: "none" }}
              accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file ? (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📎 {file.name}</div>
                <div className="text-muted">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                <div style={{ fontWeight: 500 }}>Drop your attendance file here</div>
                <div className="text-muted mt-4">Supports: Excel (.xlsx), PDF, Images</div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!file || loading}
            style={{ marginTop: 16, width: "100%" }}
          >
            {loading ? "Processing your file..." : "Submit Timesheet"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#fee2e2", borderRadius: "var(--radius)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 16, padding: "16px", background: "#d1fae5", borderRadius: "var(--radius)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--success)" }}>
              ✓ Timesheet submitted successfully
            </div>
            <div style={{ fontSize: 13, color: "#065f46" }}>
              <div>Your file has been received and is being processed.</div>
              <div style={{ marginTop: 4 }}>
                Confidence: <strong>{(result.confidence * 100).toFixed(0)}%</strong>
              </div>
              {result.needs_review && (
                <div style={{ marginTop: 4, color: "var(--warning)" }}>
                  ⚠ Our team will review this submission before generating your invoice.
                </div>
              )}
            </div>
            <div className="flex gap-2" style={{ marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => navigate(`/portal/${clientId}/documents`)}>
                View My Documents
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
