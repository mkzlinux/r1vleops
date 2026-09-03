"""Orchestration service.

Entry point for a crew kickoff. Kicks the engine off on a worker thread so the
HTTP call returns fast with a dispatch id, and lets clients poll for live
progress + the finished summary/tasks/events.
"""
from __future__ import annotations

import threading

from .. import db
from ..crew import engine
from ..crew.brains import make_brain

# dispatch_id -> list of human-readable progress lines (in-memory, per-process)
_RUN_LOG: dict[int, list[str]] = {}
_RUN_LOCK = threading.Lock()


def _log(dispatch_id: int, line: str) -> None:
    with _RUN_LOCK:
        _RUN_LOG.setdefault(dispatch_id, []).append(line)


def start_kickoff(department_key: str, goal: str, process: str = "hierarchical") -> int:
    department = db.get_department(department_key)
    if not department:
        raise ValueError(f"Unknown department: {department_key}")
    goal = goal.strip()
    if not goal:
        raise ValueError("A goal/brief is required.")

    did = db.create_dispatch({
        "department_id": department["id"],
        "goal": goal,
        "process": process,
    })
    db.add_activity(f"Dispatch #{did} to {department['name']} — “{goal}”.", "dispatch",
                    department["id"], None)
    _RUN_LOG[did] = []

    def _run():
        try:
            engine.run_dispatch(
                did, department, goal, process, make_brain(),
                lambda line: _log(did, line),
            )
        except Exception as exc:  # pragma: no cover - defensive
            _log(did, f"Error: {exc}")
            with db.cursor() as cur:
                cur.execute("UPDATE dispatches SET status='error' WHERE id=?", (did,))

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return did


def dispatch_state(did: int) -> dict:
    dispatch = db.get_dispatch(did)
    if not dispatch:
        raise KeyError(did)
    dispatch["live_log"] = list(_RUN_LOG.get(did, []))
    if dispatch["status"] == "done":
        tasks = [db.get_task(i) for i in dispatch["task_ids"]]
        events = [_event_by_id(i) for i in dispatch["event_ids"]]
        dispatch["tasks"] = [t for t in tasks if t]
        dispatch["events"] = [e for e in events if e]
    return dispatch


def _event_by_id(eid: int):
    with db.cursor() as cur:
        cur.execute(
            "SELECT e.*, d.name AS dept_name, d.key AS dept_key, d.color AS dept_color,"
            " a.name AS owner_name FROM events e"
            " LEFT JOIN departments d ON d.id=e.department_id LEFT JOIN agents a ON a.id=e.owner_id"
            " WHERE e.id=?",
            (eid,),
        )
        r = cur.fetchone()
        return dict(r) if r else None
