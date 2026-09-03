"""SQLite persistence layer (stdlib `sqlite3`).

Kept dependency-free and transparent on purpose: the schema is plain SQL so a
technical founder can read it directly. Row access is dict-based.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone

from . import config

_LOCK = threading.RLock()

_SCHEMA = """
CREATE TABLE IF NOT EXISTS departments (
    id       INTEGER PRIMARY KEY,
    key      TEXT UNIQUE NOT NULL,
    name     TEXT NOT NULL,
    tagline  TEXT,
    blurb    TEXT,
    color    TEXT,
    accent   TEXT,
    icon     TEXT,
    sort     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agents (
    id          INTEGER PRIMARY KEY,
    dept_id     INTEGER NOT NULL REFERENCES departments(id),
    key         TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    title       TEXT,
    role        TEXT,
    goal        TEXT,
    backstory   TEXT,
    skills_json TEXT DEFAULT '[]',
    tools_json  TEXT DEFAULT '[]',
    status      TEXT DEFAULT 'active',      -- active | paused
    is_lead     INTEGER DEFAULT 0,
    total_runs  INTEGER DEFAULT 0,
    last_active TEXT,
    avatar      TEXT
);

CREATE TABLE IF NOT EXISTS ops_tasks (
    id            INTEGER PRIMARY KEY,
    title         TEXT NOT NULL,
    description   TEXT DEFAULT '',
    department_id INTEGER REFERENCES departments(id),
    assignee_id   INTEGER REFERENCES agents(id),
    status        TEXT DEFAULT 'todo',      -- todo | in_progress | review | done
    priority      TEXT DEFAULT 'medium',    -- low | medium | high | urgent
    due_date      TEXT,
    source        TEXT,                     -- e.g. 'dispatch:<id>' | 'manual'
    created_at    TEXT,
    updated_at    TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY,
    title         TEXT NOT NULL,
    start         TEXT NOT NULL,            -- ISO
    end           TEXT,
    all_day       INTEGER DEFAULT 0,
    kind          TEXT DEFAULT 'meeting',   -- meeting|review|deadline|follow_up|block
    department_id INTEGER REFERENCES departments(id),
    owner_id      INTEGER REFERENCES agents(id),
    note          TEXT DEFAULT '',
    source        TEXT,
    created_at    TEXT
);

CREATE TABLE IF NOT EXISTS dispatches (
    id           INTEGER PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    goal         TEXT NOT NULL,
    process      TEXT DEFAULT 'hierarchical',
    status       TEXT DEFAULT 'running',    -- running | done | error
    summary      TEXT,
    task_ids_json  TEXT DEFAULT '[]',
    event_ids_json TEXT DEFAULT '[]',
    lead_agent_id  INTEGER,
    created_at   TEXT,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS activities (
    id          INTEGER PRIMARY KEY,
    dept_id     INTEGER,
    agent_id    INTEGER,
    kind        TEXT DEFAULT 'activity',    -- activity | dispatch | task | meeting
    message     TEXT,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS memories (
    id         INTEGER PRIMARY KEY,
    agent_id   INTEGER NOT NULL REFERENCES agents(id),
    role       TEXT DEFAULT 'assistant',    -- user | assistant
    content    TEXT,
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_dept  ON ops_tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON ops_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
CREATE INDEX IF NOT EXISTS idx_activities_time ON activities(created_at);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(str(config.DB_PATH), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def cursor():
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        finally:
            conn.close()


def init_db() -> None:
    with cursor() as cur:
        cur.executescript(_SCHEMA)
    # seed only when empty
    with cursor() as cur:
        cur.execute("SELECT COUNT(*) AS c FROM departments")
        if cur.fetchone()["c"] == 0:
            _seed(cur)


# --------------------------------------------------------------------------
# Row helpers
# --------------------------------------------------------------------------

def _rows(cur: sqlite3.Cursor, sql: str, params: tuple = ()) -> list[dict]:
    cur.execute(sql, params)
    return [dict(r) for r in cur.fetchall()]


def _row(cur: sqlite3.Cursor, sql: str, params: tuple = ()) -> dict | None:
    cur.execute(sql, params)
    r = cur.fetchone()
    return dict(r) if r else None


def jload(value) -> list:
    try:
        return json.loads(value) if value else []
    except (TypeError, json.JSONDecodeError):
        return []


def jdump(value) -> str:
    return json.dumps(value or [])


def row_count(cur: sqlite3.Cursor, sql: str, params: tuple = ()) -> int:
    cur.execute(sql, params)
    return cur.fetchone()[0]


# --------------------------------------------------------------------------
# Read API (used by routers)
# --------------------------------------------------------------------------

def get_departments():
    with cursor() as cur:
        return _rows(
            cur,
            "SELECT d.*,"
            " (SELECT COUNT(*) FROM agents a WHERE a.dept_id=d.id AND a.status='active') AS agent_count,"
            " (SELECT COUNT(*) FROM ops_tasks t WHERE t.department_id=d.id AND t.status!='done') AS open_tasks,"
            " (SELECT COUNT(*) FROM ops_tasks t WHERE t.department_id=d.id AND t.status='done') AS done_tasks"
            " FROM departments d ORDER BY d.sort",
        )


def get_department(key: str):
    with cursor() as cur:
        return _row(cur, "SELECT * FROM departments WHERE key=?", (key,))


def get_agents(dept_key: str | None = None):
    with cursor() as cur:
        if dept_key:
            return _rows(
                cur,
                "SELECT a.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
                " (SELECT COUNT(*) FROM ops_tasks t WHERE t.assignee_id=a.id AND t.status!='done') AS open_tasks"
                " FROM agents a JOIN departments d ON d.id=a.dept_id"
                " WHERE d.key=? AND a.status='active' ORDER BY a.is_lead DESC, a.name",
                (dept_key,),
            )
        return _rows(
            cur,
            "SELECT a.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
            " (SELECT COUNT(*) FROM ops_tasks t WHERE t.assignee_id=a.id AND t.status!='done') AS open_tasks"
            " FROM agents a JOIN departments d ON d.id=a.dept_id"
            " WHERE a.status='active' ORDER BY d.sort, a.is_lead DESC, a.name",
        )


def get_agent(agent_id: int):
    with cursor() as cur:
        a = _row(cur, "SELECT * FROM agents WHERE id=?", (agent_id,))
        if a:
            a["skills"] = jload(a.pop("skills_json"))
            a["tools"] = jload(a.pop("tools_json"))
        return a


def decorate_agent(row: dict) -> dict:
    row = dict(row)
    row["skills"] = jload(row.get("skills_json"))
    row["tools"] = jload(row.get("tools_json"))
    return row


def get_tasks(dept_key: str | None = None, status: str | None = None):
    sql = (
        "SELECT t.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
        " a.name AS assignee_name, a.title AS assignee_title, a.avatar AS assignee_avatar"
        " FROM ops_tasks t"
        " LEFT JOIN departments d ON d.id=t.department_id"
        " LEFT JOIN agents a ON a.id=t.assignee_id"
        " WHERE 1=1"
    )
    params: list = []
    if dept_key:
        sql += " AND d.key=?"
        params.append(dept_key)
    if status:
        sql += " AND t.status=?"
        params.append(status)
    sql += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,"
    sql += " COALESCE(t.due_date,'9999') ASC, t.id DESC"
    with cursor() as cur:
        return _rows(cur, sql, tuple(params))


def create_task(data: dict) -> int:
    ts = now_iso()
    with cursor() as cur:
        cur.execute(
            "INSERT INTO ops_tasks (title, description, department_id, assignee_id, status, priority, due_date, source, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                data.get("title"),
                data.get("description", ""),
                data.get("department_id"),
                data.get("assignee_id"),
                data.get("status", "todo"),
                data.get("priority", "medium"),
                data.get("due_date"),
                data.get("source"),
                ts,
                ts,
            ),
        )
        return cur.lastrowid


def get_task(task_id: int) -> dict | None:
    with cursor() as cur:
        return _row(
            cur,
            "SELECT t.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
            " a.name AS assignee_name, a.title AS assignee_title, a.avatar AS assignee_avatar"
            " FROM ops_tasks t LEFT JOIN departments d ON d.id=t.department_id"
            " LEFT JOIN agents a ON a.id=t.assignee_id WHERE t.id=?",
            (task_id,),
        )


def update_task(task_id: int, fields: dict) -> None:
    if not fields:
        return
    allowed = {"description", "assignee_id", "status", "priority", "due_date", "title"}
    sets, params = [], []
    for k, v in fields.items():
        if k in allowed:
            sets.append(f"{k}=?")
            params.append(v)
    if not sets:
        return
    sets.append("updated_at=?")
    params.append(now_iso())
    params.append(task_id)
    with cursor() as cur:
        cur.execute(f"UPDATE ops_tasks SET {', '.join(sets)} WHERE id=?", params)


def delete_task(task_id: int) -> None:
    with cursor() as cur:
        cur.execute("DELETE FROM ops_tasks WHERE id=?", (task_id,))


# --- events ------------------------------------------------------------------

def get_events(start: str | None = None, end: str | None = None, dept_key: str | None = None):
    sql = (
        "SELECT e.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
        " a.name AS owner_name, a.title AS owner_title"
        " FROM events e LEFT JOIN departments d ON d.id=e.department_id"
        " LEFT JOIN agents a ON a.id=e.owner_id WHERE 1=1"
    )
    params: list = []
    if start:
        sql += " AND e.start >= ?"
        params.append(start)
    if end:
        sql += " AND e.start < ?"
        params.append(end)
    if dept_key:
        sql += " AND d.key=?"
        params.append(dept_key)
    sql += " ORDER BY e.start ASC"
    with cursor() as cur:
        return _rows(cur, sql, tuple(params))


def create_event(data: dict) -> int:
    with cursor() as cur:
        cur.execute(
            "INSERT INTO events (title, start, end, all_day, kind, department_id, owner_id, note, source, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                data.get("title"),
                data.get("start"),
                data.get("end"),
                1 if data.get("all_day") else 0,
                data.get("kind", "meeting"),
                data.get("department_id"),
                data.get("owner_id"),
                data.get("note", ""),
                data.get("source"),
                now_iso(),
            ),
        )
        return cur.lastrowid


def update_event(event_id: int, fields: dict) -> None:
    allowed = {"title", "start", "end", "all_day", "kind", "note", "department_id", "owner_id"}
    sets, params = [], []
    for k, v in fields.items():
        if k in allowed:
            if k == "all_day":
                v = 1 if v else 0
            sets.append(f"{k}=?")
            params.append(v)
    if not sets:
        return
    params.append(event_id)
    with cursor() as cur:
        cur.execute(f"UPDATE events SET {', '.join(sets)} WHERE id=?", params)


def delete_event(event_id: int) -> None:
    with cursor() as cur:
        cur.execute("DELETE FROM events WHERE id=?", (event_id,))


# --- dispatches / activities / memory ---------------------------------------

def create_dispatch(data: dict) -> int:
    with cursor() as cur:
        cur.execute(
            "INSERT INTO dispatches (department_id, goal, process, status, lead_agent_id, created_at)"
            " VALUES (?,?,?,?,?,?)",
            (data.get("department_id"), data.get("goal"), data.get("process", "hierarchical"),
             "running", data.get("lead_agent_id"), now_iso()),
        )
        return cur.lastrowid


def finish_dispatch(did: int, status: str, summary: str, task_ids: list, event_ids: list) -> None:
    with cursor() as cur:
        cur.execute(
            "UPDATE dispatches SET status=?, summary=?, task_ids_json=?, event_ids_json=?, completed_at=? WHERE id=?",
            (status, summary, jdump(task_ids), jdump(event_ids), now_iso(), did),
        )


def get_dispatch(did: int) -> dict | None:
    with cursor() as cur:
        d = _row(
            cur,
            "SELECT dp.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
            " a.name AS lead_name, a.avatar AS lead_avatar"
            " FROM dispatches dp LEFT JOIN departments d ON d.id=dp.department_id"
            " LEFT JOIN agents a ON a.id=dp.lead_agent_id WHERE dp.id=?",
            (did,),
        )
        if d:
            d["task_ids"] = jload(d.pop("task_ids_json"))
            d["event_ids"] = jload(d.pop("event_ids_json"))
        return d


def recent_dispatches(limit: int = 10):
    with cursor() as cur:
        rows = _rows(
            cur,
            "SELECT dp.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color"
            " FROM dispatches dp LEFT JOIN departments d ON d.id=dp.department_id"
            " ORDER BY dp.id DESC LIMIT ?",
            (limit,),
        )
        for r in rows:
            r["task_ids"] = jload(r.pop("task_ids_json"))
            r["event_ids"] = jload(r.pop("event_ids_json"))
        return rows


def bump_agent_runs(agent_id: int) -> None:
    with cursor() as cur:
        cur.execute("UPDATE agents SET total_runs=total_runs+1, last_active=? WHERE id=?",
                    (now_iso(), agent_id))


def add_activity(message: str, kind: str = "activity", dept_id=None, agent_id=None) -> None:
    with cursor() as cur:
        cur.execute(
            "INSERT INTO activities (dept_id, agent_id, kind, message, created_at) VALUES (?,?,?,?,?)",
            (dept_id, agent_id, kind, message, now_iso()),
        )


def get_activities(limit: int = 50, dept_key: str | None = None):
    sql = (
        "SELECT ac.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
        " a.name AS agent_name, a.avatar AS agent_avatar"
        " FROM activities ac LEFT JOIN departments d ON d.id=ac.dept_id"
        " LEFT JOIN agents a ON a.id=ac.agent_id"
    )
    params: list = []
    if dept_key:
        sql += " WHERE d.key=?"
        params.append(dept_key)
    sql += " ORDER BY ac.id DESC LIMIT ?"
    params.append(limit)
    with cursor() as cur:
        return _rows(cur, sql, tuple(params))


def remember(agent_id: int, role: str, content: str) -> None:
    with cursor() as cur:
        cur.execute("INSERT INTO memories (agent_id, role, content, created_at) VALUES (?,?,?,?)",
                    (agent_id, role, content, now_iso()))


def get_memories(agent_id: int, limit: int = 20):
    with cursor() as cur:
        return _rows(cur,
                     "SELECT * FROM memories WHERE agent_id=? ORDER BY id DESC LIMIT ?",
                     (agent_id, limit))


def reset_ops():
    """Clear volatile operational data (tasks, events, dispatches, activities)."""
    with cursor() as cur:
        cur.execute("DELETE FROM dispatches")
        cur.execute("DELETE FROM events")
        cur.execute("DELETE FROM ops_tasks")
        cur.execute("DELETE FROM activities")
        cur.execute("DELETE FROM memories")


# --------------------------------------------------------------------------
# Seed data
# --------------------------------------------------------------------------

def _seed(cur: sqlite3.Cursor) -> None:
    depts = [
        ("intelligence", "Intelligence", "Finance · Fintech · Deep-Tech",
         "Finance, fintech and software engineering intelligence — market signal, product and capital.",
         "#7c5cff", "#a78bfa", "signal", 0),
        ("creative", "Creative Studio", "Brand · Copy · Design",
         "The studio that gives the company a voice and a face — identity, content and media.",
         "#f43f5e", "#fb7185", "palette", 1),
        ("security", "Security", "Cybersecurity · Sec-Ops",
         "Defense in depth: monitoring, threat intel, secure builds and incident response.",
         "#10b981", "#34d399", "shield", 2),
    ]
    dept_ids = {}
    for d in depts:
        cur.execute(
            "INSERT INTO departments (key, name, tagline, blurb, color, accent, icon, sort) VALUES (?,?,?,?,?,?,?,?)",
            d,
        )
        dept_ids[d[0]] = cur.lastrowid

    agents = [
        # ---- INTELLIGENCE ----
        ("mira", "intelligence", "Mira Voss", "Chief Intelligence Officer",
         "Chief Intelligence Officer & Strategy Lead",
         "Turn raw market, fintech and deep-tech signal into a prioritized, investable operating plan and drive the intelligence crew.",
         "Mira runs the desk's Intelligence department. She opens every engagement by framing the real question, cuts noise fast, and hands each workstream to the right specialist with an explicit expected output. She reports in plain, decision-ready language.",
         ["strategy", "research", "synthesis", "fintech", "briefing"],
         ["research", "calendar", "tasks", "memo"], 1, "MV"),
        ("ade", "intelligence", "Ade Okonkwo", "Fintech & Capital Markets Analyst",
         "Fintech & Capital-Markets Analyst",
         "Deliver diligence-grade analysis on fintech models, payments, capital markets and regulatory exposure.",
         "Ade tracks the payments and fintech stack end to end: unit economics, distribution, moats and the regulation most founders miss. Every brief he touches comes back as a structured thesis you can act on.",
         ["finance", "fintech", "market-analysis", "compliance"],
         ["research", "tasks", "memo"], 0, "AO"),
        ("lena", "intelligence", "Lena Park", "Software & Deep-Tech Engineering Lead",
         "Software & Deep-Tech Engineering Lead",
         "Own technical strategy and delivery for AI, blockchain and software work — from architecture to code review.",
         "Lena architects the build: she picks pragmatic stacks, spots blockchains/AI hype versus substance, and holds the codebase to reviewable standards. When you brief a product idea, she returns a build plan a human or an AI can execute.",
         ["software", "ai", "blockchain", "architecture", "code-review"],
         ["research", "tasks", "calendar", "memo"], 0, "LP"),
        # ---- CREATIVE ----
        ("noa", "creative", "Noa Reyes", "Creative Director",
         "Creative Director & Studio Lead",
         "Translate the company strategy into a distinctive creative direction and run every brief through the studio to a polished deliverable.",
         "Noa guards the brand. He decides the look and tone, briefs copy and design, and signs off every output against the strategy — so nothing leaves the studio half-formed.",
         ["art-direction", "brand", "creative-strategy", "design"],
         ["calendar", "tasks", "memo"], 1, "NR"),
        ("idris", "creative", "Idris Bello", "Brand & Copy Writer",
         "Brand & Copy Writer",
         "Write clear, on-voice copy — web, decks, launches and comms — that says what the company means.",
         "Idris is the words person. He turns dense product and strategy notes into crisp, human copy without dumbing the idea down. Tone, structure and grammar are his non-negotiables.",
         ["copywriting", "brand-voice", "storytelling", "launches"],
         ["research", "tasks", "memo"], 0, "IB"),
        ("yuki", "creative", "Yuki Tanaka", "Designer & Multimedia",
         "Brand Designer & Multimedia",
         "Produce visual systems, interface mockups and media assets that make the company look unmistakable.",
         "Yuki moves between identity, interface and short-form media. She turns a creative direction into actual screens and assets, consistent and on-brand, ready for production or review.",
         ["design", "ui", "brand-identity", "motion"],
         ["tasks", "calendar", "memo"], 0, "YT"),
        # ---- SECURITY ----
        ("dana", "security", "Dana Whitfield", "Chief Security Officer",
         "CISO & Sec-Ops Lead",
         "Own the company's security posture: policy, monitoring, and keeping every build and vendor decision safe.",
         "Dana treats security as a business function. She decides what gets protected, what's monitored, and when a threat is worth the team's attention. Security briefs come back as prioritized, plain-English actions.",
         ["security", "policy", "risk", "leadership"],
         ["research", "calendar", "tasks", "memo"], 1, "DW"),
        ("ravi", "security", "Ravi Patel", "Threat Intelligence & SOC Analyst",
         "Threat Intelligence & SOC Analyst",
         "Watch the perimeter and inbox, triage alerts and keep a current picture of threats facing the business.",
         "Ravi is the desk's eyes. He triages alerts and indicators, researches emerging campaigns, and keeps an always-current watchlist of what could actually hurt the company.",
         ["soc", "threat-intel", "triage", "phishing"],
         ["research", "tasks", "memo"], 0, "RP"),
        ("sana", "security", "Sana Khalil", "Security Engineer / Red Team",
         "Security Engineer & Red Team",
         "Find and fix the vulnerabilities before someone else does — in code, infra and processes.",
         "Sana breaks things on purpose. She reviews builds for security flaws, tests controls and infrastructure, and delivers findings with a concrete remediation path, prioritized by real risk.",
         ["pentest", "secure-code", "appsec", "remediation"],
         ["research", "tasks", "calendar", "memo"], 0, "SK"),
    ]
    for a in agents:
        key, dkey, name, title, role, goal, backstory, skills, tools, lead, avatar = a
        cur.execute(
            "INSERT INTO agents (dept_id, key, name, title, role, goal, backstory, skills_json, tools_json,"
            " status, is_lead, avatar, total_runs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)",
            (dept_ids[dkey], key, name, title, role, goal, backstory,
             json.dumps(skills), json.dumps(tools), "active", lead, avatar),
        )

    # A couple of starter activities so the desk isn't empty.
    welcome = [
        (dept_ids["intelligence"], None, "The crew is online. Brief the Intelligence desk with a question or objective.",
         "activity"),
        (dept_ids["creative"], None, "Creative Studio is ready — pitch a brand, launch or content brief.", "activity"),
        (dept_ids["security"], None, "Security desk armed. Send a posture review or incident to the crew.", "activity"),
    ]
    for dept, agent, msg, kind in welcome:
        cur.execute(
            "INSERT INTO activities (dept_id, agent_id, kind, message, created_at) VALUES (?,?,?,?,?)",
            (dept, agent, kind, msg, now_iso()),
        )
