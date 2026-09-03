import type {
  Agent,
  Department,
  DispatchState,
  EventItem,
  Task,
  TaskStatus,
} from "./types";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => req<{ company: string; tagline: string; llm: string }>("/meta"),

  overview: () =>
    req<{
      departments: Department[];
      task_totals: { open: number; done: number };
      activity: any[];
      dispatches: DispatchSummaryLike[];
    }>("/overview"),

  departments: () => req<Department[]>("/departments"),
  department: (key: string) =>
    req<Department & { agents: Agent[]; open_tasks: Task[]; activity: any[] }>(
      `/departments/${key}`,
    ),

  agents: (dept?: string) =>
    req<Agent[]>(dept ? `/agents?dept=${dept}` : "/agents"),

  tasks: (dept?: string) =>
    req<Task[]>(dept ? `/tasks?dept=${dept}` : "/tasks"),

  createTask: (data: Partial<Task>) =>
    req<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  patchTask: (id: number, data: Partial<Task>) =>
    req<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: number) =>
    req<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" }),

  events: () => req<EventItem[]>("/events"),
  createEvent: (data: Partial<EventItem>) =>
    req<number>("/events", { method: "POST", body: JSON.stringify(data) }),
  deleteEvent: (id: number) =>
    req<{ ok: boolean }>(`/events/${id}`, { method: "DELETE" }),

  kickoff: (data: { department: string; goal: string; process?: string }) =>
    req<{ dispatch_id: number }>("/dispatch", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  dispatch: (id: number) =>
    req<DispatchState>(`/dispatch/${id}`).then(normalize),
  dispatches: () =>
    req<DispatchSummaryLike[]>("/dispatches").then((l) => l.map(normalize)),
  demo: () =>
    req<{ dispatch_id: number }>("/dispatch/demo", { method: "POST" }),

  reset: () => req<{ ok: boolean }>("/reset", { method: "POST" }),
};

// Backend may return null for JSON columns on some endpoints; normalize.
function normalize<T extends { task_ids?: any; event_ids?: any }>(row: T): T {
  if (row.task_ids == null) (row as any).task_ids = [];
  if (row.event_ids == null) (row as any).event_ids = [];
  return row;
}

export interface DispatchSummaryLike {
  id: number;
  goal: string;
  status: string;
  summary?: string | null;
  created_at?: string;
  dept_name?: string;
  dept_key?: string;
  dept_color?: string;
  lead_name?: string;
  lead_avatar?: string;
  process?: string;
  task_ids?: number[];
  event_ids?: number[];
  live_log?: string[];
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: "To do", color: "#64748b" },
  in_progress: { label: "In progress", color: "#0ea5e9" },
  review: { label: "In review", color: "#f59e0b" },
  done: { label: "Done", color: "#22c55e" },
};

export const PRIORITY_ORDER: Task["priority"][] = [
  "urgent",
  "high",
  "medium",
  "low",
];

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
