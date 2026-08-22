import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portal } from "../../api";
import Badge from "../../components/Badge";

export default function PortalDocuments() {
  const { clientId } = useParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    portal.documents(clientId, { page, page_size: 20 }).then((r) => {
      setItems(r.data.items);
      setTotal(r.data.total);
    });
  }, [clientId, page]);

  return (
    <div className="page">
      <div className="flex justify-between items-center mb-4">
        <div className="section-title">My Documents</div>
        <span className="text-muted">{total} total</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Source</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.file_name}</td>
                  <td><Badge value={doc.source} /></td>
                  <td><Badge value={doc.status} /></td>
                  <td>{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="empty-state">No documents uploaded yet</td></tr>
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
