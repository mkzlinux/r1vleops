import { PRIORITY_ORDER, STATUS_META } from "../api";
import type { Priority, TaskStatus } from "../types";

export function Avatar({
  name,
  initials,
  color,
  size = 34,
}: {
  name?: string;
  initials?: string;
  color?: string;
  size?: number;
}) {
  const grad = `linear-gradient(135deg, ${color || "#7c5cff"}, ${color || "#7c5cff"}99)`;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: grad }}
      title={name}
    >
      {initials || "•"}
    </span>
  );
}

export function StatusPill({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status] || STATUS_META.todo;
  return (
    <span className="pill" style={{ color: m.color, borderColor: `${m.color}55`, background: `${m.color}1a` }}>
      {m.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const color: Record<Priority, string> = {
    urgent: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#64748b",
  };
  return (
    <span className="pill" style={{ color: color[priority], borderColor: `${color[priority]}55`, background: `${color[priority]}1a` }}>
      {priority}
    </span>
  );
}

export function DeptBar({ color, name }: { color?: string; name?: string }) {
  return (
    <span className="dept-pill" style={{ borderColor: `${color || "#666"}55`, color: color || "#ccc" }}>
      {name || "General"}
    </span>
  );
}

export function prioRank(p: Priority) {
  return PRIORITY_ORDER.indexOf(p);
}
