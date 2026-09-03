import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Department, EventItem } from "../types";
import Modal, { Field } from "../components/Modal";

const KIND_META: Record<string, { label: string; color: string }> = {
  review: { label: "Review", color: "#f59e0b" },
  deadline: { label: "Deadline", color: "#ef4444" },
  meeting: { label: "Meeting", color: "#7c5cff" },
  follow_up: { label: "Follow-up", color: "#0ea5e9" },
  block: { label: "Block", color: "#64748b" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function iso(d: Date) {
  return d.toISOString();
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState("all");
  const [selected, setSelected] = useState<Date>(startOfDay(new Date()));
  const [addOpen, setAddOpen] = useState(false);

  const load = () => {
    Promise.all([api.events(), api.departments()])
      .then(([e, d]) => {
        setEvents(e);
        setDepts(d);
      })
      .catch(() => {});
  };
  useEffect(load, []);

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    return cells;
  }, [cursor]);

  const eventsFor = (day: Date) => {
    let list = events.filter((e) => sameDay(new Date(e.start), day));
    if (deptFilter !== "all") list = list.filter((e) => e.dept_key === deptFilter);
    return list.sort((a, b) => a.start.localeCompare(b.start));
  };

  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selEvents = eventsFor(selected);
  const kindColor = (k: string) => (KIND_META[k] || KIND_META.meeting).color;

  return (
    <div className="page cal-page">
      <header className="page-head">
        <div>
          <div className="kicker">Schedule</div>
          <h1>Calendar</h1>
          <p className="muted sub">Meetings, review checkpoints and deadlines. Crew dispatches schedule their own reviews.</p>
        </div>
        <button className="btn primary big" onClick={() => setAddOpen(true)}>+ Add event</button>
      </header>

      <div className="filter-row">
        {depts.map((d) => (
          <button key={d.key} className={`chip ${deptFilter === d.key ? "on" : ""}`} onClick={() => setDeptFilter(d.key)}>
            <i className="dept-dot" style={{ background: d.color }} /> {d.name}
          </button>
        ))}
        <button className={`chip ${deptFilter === "all" ? "on" : ""}`} onClick={() => setDeptFilter("all")}>All</button>
      </div>

      <div className="cal-layout">
        <section className="cal-grid-wrap">
          <div className="cal-toolbar">
            <button className="mini" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
            <span className="cal-month">{monthName}</span>
            <button className="mini" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
            <button className="btn ghost sm" onClick={() => { const t = startOfDay(new Date()); setCursor(t); setSelected(t); }}>Today</button>
          </div>
          <div className="cal-grid">
            {DAYS.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
            {grid.map((day) => {
              const evs = eventsFor(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const isSel = sameDay(day, selected);
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={iso(day)}
                  className={`cal-cell ${inMonth ? "" : "out"} ${isSel ? "sel" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => setSelected(day)}
                >
                  <div className="cal-num">{day.getDate()}</div>
                  <div className="cal-events">
                    {evs.slice(0, 3).map((e) => (
                      <div className="cal-chip" key={e.id} style={{ background: `${kindColor(e.kind)}22`, color: kindColor(e.kind), borderLeftColor: kindColor(e.kind) }}>
                        <span className="cc-time">{e.all_day ? "·" : time(e.start)}</span>
                        <span className="cc-title">{e.title}</span>
                      </div>
                    ))}
                    {evs.length > 3 && <div className="muted tiny more">+{evs.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="day-panel">
          <div className="day-head">
            <h3>{selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3>
            <button className="btn ghost sm" onClick={() => setAddOpen(true)}>+ Event</button>
          </div>
          {selEvents.length === 0 && <div className="muted">Nothing scheduled.</div>}
          {selEvents.map((e) => (
            <div className="day-event" key={e.id} style={{ borderLeftColor: kindColor(e.kind) }}>
              <div className="de-time">{e.all_day ? "All day" : time(e.start)}{e.end ? `–${time(e.end)}` : ""}</div>
              <div className="de-title">{e.title}</div>
              <div className="muted tiny">
                {KIND_META[e.kind]?.label || e.kind}
                {e.dept_name ? ` · ${e.dept_name}` : ""}
                {e.owner_name ? ` · ${e.owner_name}` : ""}
              </div>
              {e.note && <div className="de-note">{e.note}</div>}
              <button className="mini danger" onClick={async () => { await api.deleteEvent(e.id); load(); }}>Remove</button>
            </div>
          ))}
        </aside>
      </div>

      {addOpen && (
        <AddEventModal
          depts={depts}
          defDate={selected}
          onClose={() => setAddOpen(false)}
          onSaved={() => { load(); setAddOpen(false); }}
        />
      )}
    </div>
  );
}

function time(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function AddEventModal({ depts, defDate, onClose, onSaved }: { depts: Department[]; defDate: Date; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("meeting");
  const [date, setDate] = useState(defDate.toISOString().slice(0, 10));
  const [hour, setHour] = useState("10:00");
  const [dept, setDept] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const start = new Date(`${date}T${hour}:00`).toISOString();
    const payload: any = { title, kind, start, note };
    const d = depts.find((x) => x.key === dept);
    payload.department_id = d?.id;
    await api.createEvent(payload);
    setBusy(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Add event">
      <div className="form">
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly ops sync" autoFocus /></Field>
        <div className="form-row">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" value={hour} onChange={(e) => setHour(e.target.value)} /></Field>
        </div>
        <div className="form-row">
          <Field label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">General</option>
              {depts.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Note"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="form-actions">
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={create} disabled={busy || !title.trim()}>Add to calendar</button>
        </div>
      </div>
    </Modal>
  );
}
