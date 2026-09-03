import { useEffect, useMemo, useState } from "react";
import { api, fmtDate, STATUS_META } from "../api";
import type { Agent, Department, Priority, Task, TaskStatus } from "../types";
import Modal, { Field } from "../components/Modal";
import { Avatar, PriorityPill, StatusPill, DeptBar } from "../components/ui";

const COLS: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [openNew, setOpenNew] = useState(false);

  const load = () => {
    Promise.all([api.tasks(), api.agents(), api.departments()])
      .then(([t, a, d]) => {
        setTasks(t);
        setAgents(a);
        setDepts(d);
      })
      .catch(() => {});
  };
  useEffect(load, []);

  const move = async (id: number, to: TaskStatus) => {
    await api.patchTask(id, { status: to });
    load();
  };

  const columns = useMemo(() => {
    const list = deptFilter === "all" ? tasks : tasks.filter((t) => t.dept_key === deptFilter);
    return COLS.map((c) => ({
      status: c,
      items: list.filter((t) => t.status === c).sort((a, b) => (a.due_date || "9").localeCompare(b.due_date || "9")),
    }));
  }, [tasks, deptFilter]);

  return (
    <div className="page board-page">
      <header className="page-head">
        <div>
          <div className="kicker">Execution</div>
          <h1>Ops board</h1>
          <p className="muted sub">Workstreams from crew dispatches and manual tasks, moving to done.</p>
        </div>
        <button className="btn primary big" onClick={() => setOpenNew(true)}>+ New task</button>
      </header>

      <div className="filter-row">
        <button className={`chip ${deptFilter === "all" ? "on" : ""}`} onClick={() => setDeptFilter("all")}>All</button>
        {depts.map((d) => (
          <button key={d.key} className={`chip ${deptFilter === d.key ? "on" : ""}`} onClick={() => setDeptFilter(d.key)}>
            <i className="dept-dot" style={{ background: d.color }} /> {d.name}
          </button>
        ))}
      </div>

      <div className="kanban">
        {columns.map((col) => {
          const m = STATUS_META[col.status];
          return (
            <div className="col" key={col.status}>
              <div className="col-head" style={{ color: m.color }}>
                <span className="col-dot" style={{ background: m.color }} />
                {m.label}
                <span className="count">{col.items.length}</span>
              </div>
              <div className="col-body">
                {col.items.map((t) => (
                  <TaskCard key={t.id} task={t} agents={agents} onMove={move} onChange={load} />
                ))}
                {col.items.length === 0 && <div className="col-empty">drop / nothing here</div>}
              </div>
            </div>
          );
        })}
      </div>

      <NewTask
        open={openNew}
        onClose={() => setOpenNew(false)}
        agents={agents}
        depts={depts}
        onSaved={() => { load(); setOpenNew(false); }}
      />
    </div>
  );
}

function TaskCard({ task, agents, onMove, onChange }: { task: Task; agents: Agent[]; onMove: (id: number, s: TaskStatus) => void; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const idx = COLS.indexOf(task.status);
  const overdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "done";
  return (
    <div className="card task-card" onClick={() => setEditing(true)} style={{ borderLeftColor: task.dept_color }}>
      <div className="tc-top">
        <PriorityPill priority={task.priority} />
        {task.dept_key && <DeptBar color={task.dept_color} name={task.dept_name} />}
      </div>
      <div className="tc-title">{task.title}</div>
      {task.description && <div className="muted tiny tc-desc">{task.description.slice(0, 90)}{task.description.length > 90 ? "…" : ""}</div>}
      <div className="tc-foot">
        <span className={`due ${overdue ? "over" : ""}`}>{overdue ? "⚠ " : "⌁ "}{fmtDate(task.due_date)}</span>
        <div className="tc-moves">
          {idx > 0 && <button className="mini" onClick={(e) => { e.stopPropagation(); onMove(task.id, COLS[idx - 1]); }}>◀</button>}
          {idx < COLS.length - 1 && <button className="mini" onClick={(e) => { e.stopPropagation(); onMove(task.id, COLS[idx + 1]); }}>▶</button>}
        </div>
      </div>
      {editing && (
        <EditTask
          task={task}
          agents={agents}
          onClose={() => setEditing(false)}
          onSaved={() => { onChange(); setEditing(false); }}
        />
      )}
    </div>
  );
}

function EditTask({ task, agents, onClose, onSaved }: { task: Task; agents: Agent[]; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assignee, setAssignee] = useState<string>(task.assignee_id ? String(task.assignee_id) : "");
  const [due, setDue] = useState(task.due_date ? task.due_date.slice(0, 16) : "");
  const [del, setDel] = useState(false);

  const save = async () => {
    const patch: any = { status, priority };
    if (assignee) patch.assignee_id = Number(assignee); else patch.assignee_id = null;
    if (due) patch.due_date = new Date(due).toISOString(); else patch.due_date = null;
    await api.patchTask(task.id, patch);
    onSaved();
  };
  return (
    <Modal open onClose={onClose} title={<span>Edit task <span className="modal-sub">#{task.id}</span></span>}>
      <div className="form">
        <div className="form-row">
          <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>{COLS.map((c) => <option key={c} value={c}>{STATUS_META[c].label}</option>)}</select></Field>
          <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(["low", "medium", "high", "urgent"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        </div>
        <Field label="Assignee (AI employee)">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.title}</option>)}
          </select>
        </Field>
        <Field label="Due"><input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <div className="form-actions">
          <button className="btn danger ghost" onClick={async () => { await api.deleteTask(task.id); onSaved(); }}>Delete</button>
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save changes</button>
        </div>
      </div>
    </Modal>
  );
}

function NewTask({ open, onClose, agents, depts, onSaved }: { open: boolean; onClose: () => void; agents: Agent[]; depts: Department[]; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dept, setDept] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredAgents = dept ? agents.filter((a) => a.dept_key === dept) : agents;

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const payload: any = { title, description: desc, status: "todo", priority };
    if (dept) {
      const d = depts.find((x) => x.key === dept);
      payload.department_id = d?.id;
    }
    if (assignee) payload.assignee_id = Number(assignee);
    if (due) payload.due_date = new Date(due).toISOString();
    await api.createTask(payload);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <div className="form">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" autoFocus /></Field>
        <Field label="Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Details / definition of done…" /></Field>
        <div className="form-row">
          <Field label="Department">
            <select value={dept} onChange={(e) => { setDept(e.target.value); setAssignee(""); }}>
              <option value="">General</option>
              {depts.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{(["low", "medium", "high", "urgent"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        </div>
        <Field label="Assign to">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {filteredAgents.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.title}</option>)}
          </select>
        </Field>
        <Field label="Due"><input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <div className="form-actions">
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={create} disabled={busy || !title.trim()}>Create task</button>
        </div>
      </div>
    </Modal>
  );
}
