"""HTTP API for the Operations Desk."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from . import config, db
from .crew import engine
from .services import dispatch

router = APIRouter(prefix="/api")


class TaskIn(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    department_id: Optional[int] = None
    assignee_id: Optional[int] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    assignee_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


class EventIn(BaseModel):
    title: str = Field(min_length=1)
    start: str
    end: Optional[str] = None
    all_day: bool = False
    kind: str = "meeting"
    department_id: Optional[int] = None
    owner_id: Optional[int] = None
    note: str = ""


class KickoffIn(BaseModel):
    department: str = "intelligence"
    goal: str = Field(min_length=3)
    process: str = "hierarchical"


class AgentPatch(BaseModel):
    status: Optional[str] = None


# ---------------------------------------------------------------- desk overview

@router.get("/meta")
def meta():
    return {
        "company": config.COMPANY_NAME,
        "tagline": config.COMPANY_TAGLINE,
        "llm": config.LLM_BACKEND,
    }


@router.get("/overview")
def overview():
    depts = db.get_departments()
    counts = {"todo": 0, "in_progress": 0, "review": 0, "done": 0}
    for d in depts:
        pass
    for t in db.get_tasks():
        counts[t["status"]] = counts.get(t["status"], 0) + 1
    return {
        "departments": depts,
        "task_totals": {
            "open": counts["todo"] + counts["in_progress"] + counts["review"],
            "done": counts["done"],
        },
        "activity": db.get_activities(limit=12),
        "dispatches": db.recent_dispatches(limit=6),
    }


@router.get("/departments")
def departments():
    return db.get_departments()


@router.get("/departments/{key}")
def department(key: str):
    d = db.get_department(key)
    if not d:
        raise HTTPException(404, "Department not found")
    return {
        **d,
        "agents": db.get_agents(key),
        "open_tasks": db.get_tasks(key, "todo") + db.get_tasks(key, "in_progress")
                      + db.get_tasks(key, "review"),
        "activity": db.get_activities(limit=10, dept_key=key),
    }


# -------------------------------------------------------------------- crew

@router.get("/agents")
def agents(dept: Optional[str] = None):
    rows = db.get_agents(dept)
    return [db.decorate_agent(r) for r in rows]


@router.get("/agents/{agent_id}")
def agent(agent_id: int):
    a = db.get_agent(agent_id)
    if not a:
        raise HTTPException(404, "Agent not found")
    a["memories"] = db.get_memories(agent_id)
    return a


@router.patch("/agents/{agent_id}")
def agent_patch(agent_id: int, body: AgentPatch):
    with db.cursor() as cur:
        if body.status in ("active", "paused"):
            cur.execute("UPDATE agents SET status=? WHERE id=?", (body.status, agent_id))
            if cur.rowcount == 0:
                raise HTTPException(404, "Agent not found")
    return db.get_agent(agent_id)


# ---------------------------------------------------------------------- board

@router.get("/tasks")
def tasks(dept: Optional[str] = None, status: Optional[str] = None):
    return db.get_tasks(dept, status)


@router.post("/tasks")
def task_create(body: TaskIn):
    return db.get_task(db.create_task(body.model_dump()))


@router.patch("/tasks/{task_id}")
def task_patch(task_id: int, body: TaskPatch):
    if not db.get_task(task_id):
        raise HTTPException(404, "Task not found")
    db.update_task(task_id, body.model_dump(exclude_none=True))
    return db.get_task(task_id)


@router.delete("/tasks/{task_id}")
def task_delete(task_id: int):
    db.delete_task(task_id)
    return {"ok": True}


# ------------------------------------------------------------------- calendar

@router.get("/events")
def events(start: Optional[str] = None, end: Optional[str] = None, dept: Optional[str] = None):
    return db.get_events(start, end, dept)


@router.post("/events")
def event_create(body: EventIn):
    return db.create_event(body.model_dump())


@router.delete("/events/{event_id}")
def event_delete(event_id: int):
    db.delete_event(event_id)
    return {"ok": True}


# ----------------------------------------------------------------- dispatch

@router.post("/dispatch")
def kickoff(body: KickoffIn):
    """Start a crew kickoff on a department. Returns {dispatch_id} immediately."""
    try:
        did = dispatch.start_kickoff(body.department, body.goal, body.process or "hierarchical")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return {"dispatch_id": did}


@router.get("/dispatch/{dispatch_id}")
def dispatch_status(dispatch_id: int):
    try:
        return dispatch.dispatch_state(dispatch_id)
    except KeyError:
        raise HTTPException(404, "Dispatch not found")


@router.get("/dispatches")
def dispatches(limit: int = 10):
    return db.recent_dispatches(limit)


@router.post("/dispatch/demo")
def demo_kickoff():
    """One-click demo: brief the Intelligence desk and run a full crew kickoff."""
    goal = ("Assess our path to launching an AI-assisted fintech product for SMBs — "
            "market opportunity, technical build plan, and what it would take to ship a v1.")
    try:
        did = dispatch.start_kickoff("intelligence", goal, "hierarchical")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return {"dispatch_id": did}


# ------------------------------------------------------------------ utilities

@router.post("/reset")
def reset():
    db.reset_ops()
    return {"ok": True}
