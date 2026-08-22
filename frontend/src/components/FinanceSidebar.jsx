import { NavLink } from "react-router-dom";

const links = [
  { to: "/finance", label: "Overview", icon: "📊" },
  { to: "/finance/documents", label: "Documents", icon: "📁" },
  { to: "/finance/validation", label: "Validation Queue", icon: "⚠️" },
  { to: "/finance/timesheets", label: "Timesheets", icon: "📋" },
  { to: "/finance/invoices", label: "Invoices", icon: "🧾" },
  { to: "/finance/clients", label: "Clients", icon: "🏢" },
  { to: "/finance/upload", label: "Upload Doc", icon: "⬆️" },
];

export default function FinanceSidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        TIA <span>Finance</span>
      </div>
      <div className="sidebar-section">Operations</div>
      <nav>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/finance"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid #1e293b" }}>
        <NavLink to="/portal/1" style={{ fontSize: 12, color: "#64748b" }}>
          → Switch to Client Portal
        </NavLink>
      </div>
    </aside>
  );
}
