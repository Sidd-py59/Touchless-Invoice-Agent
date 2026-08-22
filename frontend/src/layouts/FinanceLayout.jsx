import { Outlet, useLocation } from "react-router-dom";
import FinanceSidebar from "../components/FinanceSidebar";

const titles = {
  "/finance": "Overview",
  "/finance/documents": "Document Queue",
  "/finance/validation": "Validation Queue",
  "/finance/timesheets": "Timesheets",
  "/finance/invoices": "Invoices",
  "/finance/clients": "Clients",
  "/finance/upload": "Upload Document",
};

export default function FinanceLayout() {
  const { pathname } = useLocation();
  const title = titles[pathname] || "Finance Dashboard";

  return (
    <div className="layout">
      <FinanceSidebar />
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{title}</span>
          <span className="topbar-badge">Finance Team</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
