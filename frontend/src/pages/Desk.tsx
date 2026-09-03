import { useEffect, useState } from "react";
import { api, timeAgo } from "../api";
import type { Department, DispatchState, Task } from "../types";
import DispatchModal from "../components/DispatchModal";
import { DeptBar } from "../components/ui";

const SAMPLE_BRIEFS: Record<string, string> = {
  intelligence:
    "Assess our path to launching an AI-assisted fintech product for SMBs — market opportunity, technical build plan, and what it takes to ship a v1.",
  creative:
    "Refresh our company identity and draft the launch narrative + web copy for the new Intelligence offering.",
  security:
    "Run a security posture review of our stack and outline the monitoring + threat-intel baseline for a small SaaS company.",
};

interface Overview {
  departments: Department[];
  task_totals: { open: number; done: number };
  activity: any[];
  dispatches: any[];
}

export default function Desk({ onDepartmentsChange }: { onDepartmentsChange: () => void }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [totals, setTotals] = useState({ open: 0, done: 0 });
  const [now, setNow] = useState(new Date());

  const [dept, setDept] = useState("intelligence");
  const [goal, setGoal] = useState(SAMPLE_BRIEFS.intelligence);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    const o = await api.overview();
    setDepartments(o.departments);
    setActivity(o.activity);
    setDispatches(o.dispatches);
    setTotals(o.task_totals);
    setNow(new Date());
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const setDeptAndBrief = (key: string) => {
    setDept(key);
    if (SAMPLE_BRIEFS[key]) setGoal(SAMPLE_BRIEFS[key]);
  };

  const dispatch = async () => {
    setErr("");
    try {
      const { dispatch_id } = await api.kickoff({ department: dept, goal });
      setRunningId(dispatch_id);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const handleSettled = () => {
    load();
    onDepartmentsChange();
  };

  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="kicker">Command center</div>
          <h1>{greet}, Founder. <span className="dim">— what are we moving today?</span></h1>
        </div>
        <div className="head-stats">
          <div className="stat"><b>{departments.length}</b><span>departments</span></div>
          <div className="stat"><b>{totals.open}</b><span>open ops</span></div>
          <div className="stat"><b>{totals.done}</b><span>completed</span></div>
        </div>
      </header>

      <section className="dispatch-card">
        <div className="dc-head">
          <div>
            <div className="panel-title">Brief the crew</div>
            <div className="muted">Give the department lead an objective — they'll plan, assign and run it as AI employees.</div>
          </div>
          <div className="dept-switch">
            {departments.map((d) => (
              <button
                key={d.key}
                className={`ds-btn ${dept === d.key ? "on" : ""}`}
                style={dept === d.key ? { borderColor: d.color, color: d.color } : {}}
                onClick={() => setDeptAndBrief(d.key)}
              >
                <i className="dept-dot" style={{ background: d.color }} />
                {d.name}
              </button>
            ))}
          </div>
        </div>
        <div className="dc-body">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="e.g. Evaluate the market for our new fintech tool and give me a build plan."
          />
          <div className="dc-actions">
            <button className="btn primary big" onClick={dispatch} disabled={!goal.trim()}>
              ▶ Dispatch the crew
            </button>
            <button className="btn ghost" onClick={async () => {
              try {
                const { dispatch_id } = await api.demo();
                setRunningId(dispatch_id);
              } catch (e: any) { setErr(String(e?.message || e)); }
            }}>
              Run a demo kickoff
            </button>
          </div>
          {err && <div className="error-banner">{err}</div>}
        </div>
      </section>

      <section className="dept-strip">
        {departments.map((d) => (
          <a key={d.key} href={`#/departments/${d.key}`} className="dept-tile" style={{ borderTopColor: d.color }}>
            <div className="dept-tile-top">
              <span className="dept-name-big">{d.name}</span>
              <span className="agents-chip">{d.agent_count} AI staff</span>
            </div>
            <div className="muted dept-tile-tag">{d.tagline}</div>
            <div className="tile-bar">
              <span style={{ color: d.color }}>{d.open_tasks} open</span>
              <span className="muted">{d.done_tasks} done</span>
            </div>
          </a>
        ))}
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head"><h2>Live activity</h2></div>
          <div className="feed">
            {activity.length === 0 && <div className="muted">Nothing yet — dispatch the crew above.</div>}
            {activity.map((a) => (
              <div className="feed-item" key={a.id}>
                <span className="feed-dot" style={{ background: a.dept_color || "#666" }} />
                <div className="feed-main">
                  <div>{a.message}</div>
                  <div className="muted tiny">{a.dept_name} · {timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Recent dispatches</h2></div>
          <div className="feed">
            {dispatches.length === 0 && <div className="muted">Crew dispatches will appear here.</div>}
            {dispatches.map((d) => (
              <div className="feed-item" key={d.id}>
                <span className="feed-dot" style={{ background: d.dept_color || "#666" }} />
                <div className="feed-main">
                  <div className="dispatch-line">
                    <span className="mono">#{d.id}</span>
                    <span className="trunc">{d.goal}</span>
                  </div>
                  <div className="muted tiny">{d.dept_name} · {d.status} · {d.created_at && timeAgo(d.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {runningId != null && (
        <DispatchModal
          dispatchId={runningId}
          onClose={() => setRunningId(null)}
          onSettled={handleSettled}
        />
      )}
    </div>
  );
}
