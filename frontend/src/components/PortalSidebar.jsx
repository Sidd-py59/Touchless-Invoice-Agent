import { NavLink, useParams } from "react-router-dom";

export default function PortalSidebar() {
  const { clientId } = useParams();
  const base = `/portal/${clientId}`;

  const links = [
    { to: base, label: "Overview", icon: "🏠" },
    { to: `${base}/invoices`, label: "My Invoices", icon: "🧾" },
    { to: `${base}/documents`, label: "My Documents", icon: "📁" },
    { to: `${base}/upload`, label: "Submit Timesheet", icon: "⬆️" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        TIA <span>Portal</span>
      </div>
      <div className="sidebar-section">Client #{clientId}</div>
      <nav>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === base}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid #1e293b" }}>
        <NavLink to="/finance" style={{ fontSize: 12, color: "#64748b" }}>
          → Switch to Finance Dashboard
        </NavLink>
      </div>
    </aside>
  );
}
