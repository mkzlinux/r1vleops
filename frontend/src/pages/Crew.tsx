import { useEffect, useState } from "react";
import { api, timeAgo } from "../api";
import type { Agent, Department } from "../types";
import { Avatar, DeptBar } from "../components/ui";

export default function Crew() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [filter, setFilter] = useState("all");
  const [focus, setFocus] = useState<Agent | null>(null);

  const load = async () => {
    const [ag, dp] = await Promise.all([api.agents(), api.departments()]);
    setAgents(ag);
    setDepts(dp);
  };
  useEffect(() => {
    load().catch(() => {});
  }, []);

  const shown = filter === "all" ? agents : agents.filter((a) => a.dept_key === filter);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="kicker">AI workforce</div>
          <h1>The crew</h1>
          <p className="muted sub">Every agent is a CrewAI-style employee: a role, a goal, skills and tools — orchestrated by their department lead.</p>
        </div>
      </header>

      <div className="filter-row">
        <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All ({agents.length})</button>
        {depts.map((d) => (
          <button key={d.key} className={`chip ${filter === d.key ? "on" : ""}`} style={filter === d.key ? { color: d.color, borderColor: d.color } : {}} onClick={() => setFilter(d.key)}>
            {d.name}
          </button>
        ))}
      </div>

      <div className="crew-layout">
        <div className="agent-grid">
          {shown.map((a) => (
            <div className={`agent-card ${focus?.id === a.id ? "sel" : ""}`} key={a.id} onClick={() => setFocus(a)}>
              <div className="ac-top">
                <Avatar initials={a.avatar} color={a.dept_color} name={a.name} size={46} />
                <div className="ac-id">
                  <div className="ac-name">
                    {a.name}
                    {a.is_lead ? <span className="lead-tag">lead</span> : null}
                  </div>
                  <div className="muted">{a.title}</div>
                  <DeptBar color={a.dept_color} name={a.dept_name} />
                </div>
              </div>
              <div className="goal-line">{a.goal}</div>
              <div className="skill-wrap">
                {a.skills?.map((s) => <span key={s} className="skill-chip">{s}</span>)}
              </div>
              <div className="muted tiny">{a.total_runs || 0} runs · {a.open_tasks || 0} open ops</div>
            </div>
          ))}
        </div>

        {focus && <AgentProfile agent={focus} />}
      </div>
    </div>
  );
}

function AgentProfile({ agent }: { agent: Agent }) {
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/agents/${agent.id}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {});
  }, [agent.id]);

  const memories = detail?.memories || [];
  return (
    <aside className="profile-panel">
      <div className="pp-head" style={{ background: `linear-gradient(135deg, ${agent.dept_color}33, transparent)` }}>
        <Avatar initials={agent.avatar} color={agent.dept_color} name={agent.name} size={64} />
        <div>
          <h3>{agent.name}</h3>
          <div className="muted">{agent.title}</div>
        </div>
        <button className="icon-btn" onClick={() => null} aria-label="close">✕</button>
      </div>
      <div className="pp-body">
        <div className="panel-title">Role & goal</div>
        <p>{agent.goal}</p>
        <div className="panel-title">Backstory</div>
        <p className="muted">{agent.backstory}</p>
        <div className="panel-title">Tools available</div>
        <div className="skill-wrap">
          {(agent.tools || []).map((t) => <span key={t} className="skill-chip tool">{t}</span>)}
        </div>
        <div className="panel-title">Recent memory</div>
        {memories.length === 0 && <div className="muted tiny">No memory yet — this agent hasn't taken a run.</div>}
        {memories.slice(0, 3).map((m: any) => (
          <div className="memory" key={m.id}>
            <div className="muted tiny">{m.role} · {m.created_at && timeAgo(m.created_at)}</div>
            <div className="mem-text">{m.content.slice(0, 260)}{m.content.length > 260 ? "…" : ""}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
