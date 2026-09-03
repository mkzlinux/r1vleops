import type { Department } from "../types";

interface Props {
  departments: Department[];
  active: string;
}

const NAV = [
  { id: "desk", label: "Desk", icon: "◉" },
  { id: "board", label: "Ops Board", icon: "▤" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "crew", label: "Crew", icon: "✦" },
  { id: "departments", label: "Departments", icon: "◈" },
];

export default function Sidebar({ departments, active }: Props) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#/desk">
        <span className="brand-mark">R1</span>
        <span className="brand-text">
          <b>r1vleops</b>
          <small>Operations Desk</small>
        </span>
      </a>

      <nav className="nav">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#/${n.id}`}
            className={`nav-item ${active === n.id ? "is-active" : ""}`}
          >
            <span className="nav-ico">{n.icon}</span>
            {n.label}
          </a>
        ))}
      </nav>

      <div className="side-section">
        <div className="side-title">Departments</div>
        {departments.map((d) => (
          <a
            key={d.key}
            href={`#/departments/${d.key}`}
            className="dept-link"
          >
            <i
              className="dept-dot"
              style={{ background: d.color, boxShadow: `0 0 0 3px ${d.color}22` }}
            />
            <span className="dept-name">{d.name}</span>
            <span className="dept-count">{d.agent_count}</span>
          </a>
        ))}
      </div>

      <div className="sidebar-foot">
        <div className="foot-chip">
          <span className="pulse" />
          Crew online · mock brain
        </div>
        <small>One founder. A whole crew.</small>
      </div>
    </aside>
  );
}
