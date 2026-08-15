"use client";

type View = "dashboard" | "assessment";

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  findingsCount: number;
}

export default function Sidebar({ activeView, onNavigate, findingsCount }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z" />
          </svg>
        </div>
        <div>
          <div className="brand-name">SecureArch</div>
          <div className="brand-sub">Security Architect</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-group">Overview</div>
        <button
          className={`nav-item${activeView === "dashboard" ? " active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`nav-item${activeView === "dashboard" ? " active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          Findings
          <span className={`nav-count${findingsCount === 0 ? " zero" : ""}`}>{findingsCount}</span>
        </button>

        <div className="nav-group">Assess</div>
        <button
          className={`nav-item${activeView === "assessment" ? " active" : ""}`}
          onClick={() => onNavigate("assessment")}
        >
          Assessment
        </button>

        <div className="nav-group">Knowledge</div>
        <button className="nav-item" disabled>
          Reports <span className="soon">soon</span>
        </button>
      </nav>

      <div className="nav-foot">
        <div className="avatar">You</div>
        <div>
          <div className="who">Your account</div>
          <div className="role">Security architect</div>
        </div>
      </div>
    </aside>
  );
}
