// src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login", { replace: true });
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/admin/doctors", label: "Doctors", icon: "👨‍⚕️" },
    { path: "/admin/patients", label: "Patients", icon: "👥" },
    { path: "/admin/reports/appointments", label: "Reports", icon: "📈" },
  ];

  return (
    <div className="sidebar-container">
      <style>{`
        /* ---- control the thickness here ---- */
        :root { --sidebar-w: 220px; }           /* was 280px */
        @media (min-width: 1600px) { :root { --sidebar-w: 240px; } } /* optional on very wide screens */

        .sidebar-container {
          width: var(--sidebar-w);
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          height: 100vh;
          color: white;
          padding: 0;
          position: fixed;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #334155;
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }

        .sidebar-header {
          padding: 20px 16px 16px;
          border-bottom: 1px solid #334155;
          background: rgba(255, 255, 255, 0.02);
        }

        .sidebar-title {
          font-size: 20px;              /* was 24px */
          font-weight: 700;
          margin: 0 0 2px 0;
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-subtitle {
          font-size: 12px;              /* was 14px */
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-container { padding: 16px 0; flex: 1; }

        .nav-list { list-style: none; padding: 0; margin: 0; }

        .nav-item { margin: 0; padding: 0 10px; }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;          /* tighter */
          color: #cbd5e1;
          text-decoration: none;
          border-radius: 10px;
          margin: 4px 4px;
          transition: all 0.25s ease;
          font-weight: 500;
          font-size: 14px;              /* was 15px */
          border: 1px solid transparent;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          border-color: #334155;
          transform: translateX(2px);
        }

        .nav-link.active {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          font-weight: 600;
        }

        .nav-icon {
          font-size: 16px;              /* was 18px */
          width: 22px;                  /* was 24px */
          text-align: center;
          transition: transform 0.25s ease;
          flex: 0 0 22px;
        }

        .nav-link.active .nav-icon { transform: scale(1.05); }

        .nav-label { flex: 1; min-width: 0; }

        .sidebar-footer {
          padding: 16px;               /* was 24px */
          border-top: 1px solid #334155;
          background: rgba(255, 255, 255, 0.02);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;          /* tighter */
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
        }

        .logout-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4); }
        .logout-btn:active { transform: translateY(0); }
        .logout-icon { font-size: 16px; }

        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;                /* was 16px */
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          margin: 12px 16px;            /* was margin-bottom only */
          border: 1px solid #334155;
        }

        .user-avatar {
          width: 34px; height: 34px;    /* was 40x40 */
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 14px;
          flex: 0 0 34px;
        }

        .user-details { flex: 1; min-width: 0; }
        .user-role { font-size: 11px; color: #94a3b8; margin-bottom: 2px; }
        .user-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }

        /* subtle item entrance */
        @keyframes slideIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        .nav-item { animation: slideIn 0.25s ease forwards; }
        .nav-item:nth-child(1){animation-delay:.05s}
        .nav-item:nth-child(2){animation-delay:.1s}
        .nav-item:nth-child(3){animation-delay:.15s}
        .nav-item:nth-child(4){animation-delay:.2s}
      `}</style>

      <div className="sidebar-header">
        <h1 className="sidebar-title">MedAdmin Pro</h1>
        <p className="sidebar-subtitle">Healthcare Management System</p>
      </div>

      <div className="user-info">
        <div className="user-avatar">A</div>
        <div className="user-details">
          <div className="user-role">Administrator</div>
          <div className="user-name">Admin User</div>
        </div>
      </div>

      <div className="nav-container">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <span className="logout-icon">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
