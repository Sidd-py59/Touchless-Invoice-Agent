import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { finance } from "../../api";
import Badge from "../../components/Badge";

export default function Documents() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = { page, page_size: 20 };
    if (statusFilter) params.status = statusFilter;
    if (sourceFilter) params.source = sourceFilter;
    finance.documents(params).then((r) => { setItems(r.data.items); setTotal(r.data.total); });
  }, [page, statusFilter, sourceFilter]);

  return (
    <div className="page">
      <div className="filters">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="uploaded">Uploaded</option>
          <option value="processing">Processing</option>
          <option value="parsed">Parsed</option>
          <option value="failed">Failed</option>
        </select>
        <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
          <option value="">All Sources</option>
          <option value="excel">Excel</option>
          <option value="pdf">PDF</option>
          <option value="image">Image</option>
          <option value="email">Email</option>
          <option value="handwritten">Handwritten</option>
        </select>
        <span className="text-muted" style={{ marginLeft: "auto" }}>{total} documents</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>File Name</th>
                <th>Client</th>
                <th>Source</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/finance/documents/${d.id}`)}>
                  <td style={{ color: "var(--gray-400)" }}>#{d.id}</td>
                  <td>{d.file_name}</td>
                  <td>{d.client_name}</td>
                  <td><Badge value={d.source} /></td>
                  <td><Badge value={d.status} /></td>
                  <td>{new Date(d.uploaded_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No documents found</td></tr>
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
