import { useEffect, useState } from "react";
import { api, timeAgo } from "../api";
import type { Agent, Department, Task } from "../types";
import DispatchModal from "../components/DispatchModal";
import { Avatar, StatusPill } from "../components/ui";

function DeptOverview() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  useEffect(() => {
    api.departments().then(setDepts).catch(() => {});
    api.agents().then(setAgents).catch(() => {});
  }, []);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="kicker">Structure</div>
          <h1>Three departments, one crew</h1>
        </div>
      </header>
      <div className="dept-grid">
        {depts.map((d) => {
          const staff = agents.filter((a) => a.dept_key === d.key);
          return (
            <a key={d.key} href={`#/departments/${d.key}`} className="dept-card" style={{ borderTopColor: d.color }}>
              <div className="dc-top">
                <span className="big-dot" style={{ background: `linear-gradient(135deg, ${d.color}, ${d.accent})` }} />
                <div>
                  <div className="dept-name-big">{d.name}</div>
                  <div className="muted">{d.tagline}</div>
                </div>
              </div>
              <p className="muted">{d.blurb}</p>
              <div className="staff-row">
                {staff.slice(0, 5).map((a) => (
                  <Avatar key={a.id} initials={a.avatar} color={d.color} name={a.name} size={30} />
                ))}
                {staff.length > 5 && <span className="muted tiny">+{staff.length - 5}</span>}
              </div>
              <div className="tile-bar">
                <span style={{ color: d.color }}>{d.open_tasks} open ops</span>
                <span className="muted">{d.agent_count} AI staff</span>
              </div>
              <div className="open-link">Open department →</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function DeptDetail({ deptKey }: { deptKey: string }) {
  const [data, setData] = useState<any>(null);
  const [goal, setGoal] = useState("");
  const [runId, setRunId] = useState<number | null>(null);

  const load = () => {
    api.department(deptKey).then(setData).catch(() => setData(null));
  };
  useEffect(load, [deptKey]);

  if (!data) return <div className="page"><div className="muted">Loading…</div></div>;

  const run = async () => {
    if (!goal.trim()) return;
    const { dispatch_id } = await api.kickoff({ department: deptKey, goal });
    setGoal("");
    setRunId(dispatch_id);
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <a className="back-link" href="#/departments">← All departments</a>
          <h1 style={{ color: data.color }}>{data.name}</h1>
          <div className="kicker">{data.tagline}</div>
        </div>
      </header>

      <div className="dept-banner" style={{ background: `linear-gradient(120deg, ${data.color}26, transparent)` }}>
        <p>{data.blurb}</p>
        <div className="banner-stats">
          <span><b>{data.agents?.length || 0}</b> AI staff</span>
          <span><b>{data.open_tasks?.length || 0}</b> open workstreams</span>
        </div>
      </div>

      <div className="inline-brief">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={`Brief the ${data.name} crew…`}
        />
        <button className="btn primary" onClick={run} disabled={!goal.trim()}>Dispatch</button>
      </div>

      <div className="card">
        <div className="card-head"><h2>AI staff</h2></div>
        <div className="agent-grid">
          {(data.agents || []).map((a: Agent) => (
            <div className="agent-card" key={a.id}>
              <div className="ac-top">
                <Avatar initials={a.avatar} color={data.color} name={a.name} size={44} />
                <div className="ac-id">
                  <div className="ac-name">
                    {a.name}
                    {a.is_lead ? <span className="lead-tag">lead</span> : null}
                  </div>
                  <div className="muted">{a.title}</div>
                </div>
              </div>
              <div className="goal-line">{a.goal}</div>
              <div className="skill-wrap">
                {a.skills?.slice(0, 4).map((s) => <span key={s} className="skill-chip">{s}</span>)}
              </div>
              <div className="muted tiny">{a.total_runs} runs · <a href={`#/crew?focus=${a.id}`}>profile</a></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Open workstreams</h2></div>
        {(data.open_tasks || []).length === 0 && <div className="muted">No open workstreams.</div>}
        {(data.open_tasks || []).map((t: Task) => (
          <div className="row-task" key={t.id}>
            <StatusPill status={t.status} />
            <div className="rt-title">{t.title}</div>
            <div className="muted">{t.assignee_name || "Unassigned"}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h2>Recent activity</h2></div>
        <div className="feed">
          {(data.activity || []).map((ac: any) => (
            <div className="feed-item" key={ac.id}>
              <span className="feed-dot" style={{ background: data.color }} />
              <div className="feed-main"><div>{ac.message}</div><div className="muted tiny">{timeAgo(ac.created_at)}</div></div>
            </div>
          ))}
        </div>
      </div>

      {runId && <DispatchModal dispatchId={runId} onClose={() => setRunId(null)} onSettled={load} />}
    </div>
  );
}

export default function Departments({ deptKey }: { deptKey?: string }) {
  return deptKey ? <DeptDetail deptKey={deptKey} /> : <DeptOverview />;
}
