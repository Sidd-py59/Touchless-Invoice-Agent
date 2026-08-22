import { Outlet } from "react-router-dom";
import PortalSidebar from "../components/PortalSidebar";

export default function PortalLayout() {
  return (
    <div className="layout">
      <PortalSidebar />
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">Client Portal</span>
          <span className="topbar-badge" style={{ background: "#d1fae5", color: "#065f46" }}>Client View</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
