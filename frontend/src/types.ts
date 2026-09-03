export interface Department {
  id: number;
  key: string;
  name: string;
  tagline: string;
  blurb: string;
  color: string;
  accent: string;
  icon: string;
  sort: number;
  agent_count: number;
  open_tasks: number;
  done_tasks: number;
}

export interface Agent {
  id: number;
  dept_id: number;
  key: string;
  name: string;
  title: string;
  role: string;
  goal: string;
  backstory: string;
  skills: string[];
  tools: string[];
  status: string;
  is_lead: number;
  total_runs: number;
  last_active?: string;
  avatar: string;
  dept_name?: string;
  dept_key?: string;
  dept_color?: string;
  open_tasks?: number;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: number;
  title: string;
  description: string;
  department_id: number | null;
  assignee_id: number | null;
  status: TaskStatus;
  priority: Priority;
  due_date?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
  dept_name?: string;
  dept_key?: string;
  dept_color?: string;
  assignee_name?: string;
  assignee_title?: string;
  assignee_avatar?: string;
}

export interface EventItem {
  id: number;
  title: string;
  start: string;
  end?: string | null;
  all_day: number;
  kind: string;
  department_id: number | null;
  owner_id: number | null;
  note: string;
  source?: string | null;
  created_at?: string;
  dept_name?: string;
  dept_key?: string;
  dept_color?: string;
  owner_name?: string;
  owner_title?: string;
}

export interface Activity {
  id: number;
  dept_id?: number | null;
  agent_id?: number | null;
  kind: string;
  message: string;
  created_at: string;
  dept_name?: string;
  dept_key?: string;
  dept_color?: string;
  agent_name?: string;
  agent_avatar?: string;
}

export interface DispatchSummary {
  id: number;
  department_id: number | null;
  goal: string;
  process: string;
  status: string;
  summary?: string | null;
  task_ids: number[];
  event_ids: number[];
  lead_agent_id?: number | null;
  created_at: string;
  completed_at?: string | null;
  dept_name?: string;
  dept_key?: string;
  dept_color?: string;
  lead_name?: string;
  lead_avatar?: string;
}

export interface DispatchState extends DispatchSummary {
  live_log: string[];
  tasks?: Task[];
  events?: EventItem[];
}
