"""Crew kickoff engine.

Conceptually mirrors CrewAI's kickoff: a department *lead* opens the brief,
plans it into concrete workstreams, then relevant specialist agents *execute*
each workstream to a deliverable. Everything is written back to the SQLite desk
(tasks, calendar events, activities, agent memory).

This is intentionally self-contained and mock-friendly: the "brain" (see
`brains.py`) is the only thing doing prose, so the orchestration logic below
works identically whether the brain is Mock or OpenAI.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .. import db

# --------------------------------------------------------------------------
# Planning — turn a free-text goal into named, assigned workstreams.
# --------------------------------------------------------------------------

FINANCE_HINTS = ["financ", "invest", "market", "capital", "fintech", "payment",
                 "revenue", "pricing", "fundr", "valu", "deal", "m&a", "budget"]
TECH_HINTS = ["software", "app", "platform", "product", "build", "ai", "blockchain",
              "web3", "api", "engineer", "launch", "token", "crypto", "release"]


def _is_finance(goal: str) -> bool:
    g = goal.lower()
    return any(h in g for h in FINANCE_HINTS)


def _is_tech(goal: str) -> bool:
    g = goal.lower()
    return any(h in g for h in TECH_HINTS)


def plan_dispatch(dept_key: str, goal: str) -> list[dict]:
    """Return plan items: title, detail, assignee_key, deliverable_kind, offset_days."""
    g = goal.strip()
    if dept_key == "intelligence":
        if _is_finance(g) and not _is_tech(g):
            return [
                {
                    "title": f"Frame & scope — {_short(g)}",
                    "detail": "Define success, the decision to be made, and the questions that actually matter for this goal.",
                    "assignee_key": "mira", "deliverable_kind": "research", "offset_days": 0,
                },
                {
                    "title": f"Fintech / capital thesis — {_short(g)}",
                    "detail": "Analyse unit economics, moat, distribution and regulatory exposure; produce a diligence-grade thesis.",
                    "assignee_key": "ade", "deliverable_kind": "finance", "offset_days": 1,
                },
                {
                    "title": f"Platform & data diligence — {_short(g)}",
                    "detail": "Verify the technical layer supports the thesis: data, integrations, security posture of the stack.",
                    "assignee_key": "lena", "deliverable_kind": "software", "offset_days": 2,
                },
            ]
        if _is_tech(g):
            return [
                {
                    "title": f"Product scoping — {_short(g)}",
                    "detail": "Turn the goal into a crisp product brief: users, core loop, constraints, definition of done.",
                    "assignee_key": "mira", "deliverable_kind": "research", "offset_days": 0,
                },
                {
                    "title": f"Market read — {_short(g)}",
                    "detail": "Situate the build in the market: who buys it, adjacent competitors, and the fintech/finance angle if any.",
                    "assignee_key": "ade", "deliverable_kind": "research", "offset_days": 1,
                },
                {
                    "title": f"Technical build plan — {_short(g)}",
                    "detail": "Architecture, stack choices, milestones and a risk register — with an explicit review checkpoint.",
                    "assignee_key": "lena", "deliverable_kind": "software", "offset_days": 1,
                },
            ]
        return [
            {
                "title": f"Frame & scope — {_short(g)}",
                "detail": "Define success and the decision to be made before analysis starts.",
                "assignee_key": "mira", "deliverable_kind": "research", "offset_days": 0,
            },
            {
                "title": f"Commercial read — {_short(g)}",
                "detail": "Finance and fintech lens: market, economics and where the money is.",
                "assignee_key": "ade", "deliverable_kind": "finance", "offset_days": 1,
            },
            {
                "title": f"Feasibility & build — {_short(g)}",
                "detail": "Engineering reality-check: stack, effort, and the fastest credible path to a shippable version.",
                "assignee_key": "lena", "deliverable_kind": "software", "offset_days": 2,
            },
        ]

    if dept_key == "creative":
        return [
            {
                "title": f"Creative direction — {_short(g)}",
                "detail": "Lock the tone, visual language and message before any production begins.",
                "assignee_key": "noa", "deliverable_kind": "design", "offset_days": 0,
            },
            {
                "title": f"Copy & voice — {_short(g)}",
                "detail": "Draft the words — web copy, headline, and short-form — in the brand voice.",
                "assignee_key": "idris", "deliverable_kind": "copywriting", "offset_days": 1,
            },
            {
                "title": f"Visual / media production — {_short(g)}",
                "detail": "Translate direction into concrete screens and assets ready for review.",
                "assignee_key": "yuki", "deliverable_kind": "design", "offset_days": 2,
            },
        ]

    if dept_key == "security":
        return [
            {
                "title": f"Posture & scope — {_short(g)}",
                "detail": "Decide what needs protecting, to what standard, and who is accountable.",
                "assignee_key": "dana", "deliverable_kind": "security", "offset_days": 0,
            },
            {
                "title": f"Monitoring & threat intel — {_short(g)}",
                "detail": "Stand up the watch: what to monitor, current campaigns and the watchlist that matters.",
                "assignee_key": "ravi", "deliverable_kind": "security", "offset_days": 0,
            },
            {
                "title": f"Secure build review — {_short(g)}",
                "detail": "Review code/infra/process for exploitable gaps and produce a prioritized remediation path.",
                "assignee_key": "sana", "deliverable_kind": "security", "offset_days": 1,
            },
        ]

    # Generic fallback
    return [
        {"title": f"Scope & frame — {_short(g)}", "detail": "Clarify the objective and definition of done.",
         "assignee_key": None, "deliverable_kind": "research", "offset_days": 0},
        {"title": f"Execute — {_short(g)}", "detail": "Do the core work and capture a decision-ready hand-off.",
         "assignee_key": None, "deliverable_kind": "research", "offset_days": 1},
    ]


def _short(goal: str, n: int = 60) -> str:
    goal = " ".join(goal.split())
    return goal if len(goal) <= n else goal[: n - 1].rstrip() + "…"


# --------------------------------------------------------------------------
# Execution
# --------------------------------------------------------------------------

def _decorated_agents(dept_key: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for row in db.get_agents(dept_key):
        row = dict(row)
        row["skills"] = db.jload(row.get("skills_json"))
        row["tools"] = db.jload(row.get("tools_json"))
        out[row["key"]] = row
    return out


def _ts(dt: datetime) -> str:
    return dt.isoformat(timespec="minutes")


def run_dispatch(dispatch_id: int, department: dict, goal: str, process: str,
                 brain, log: list[str]) -> None:
    """Execute a crew kickoff for one dispatch. Called from a worker thread."""
    agents = _decorated_agents(department["key"])
    lead = next((a for a in agents.values() if a.get("is_lead")), next(iter(agents.values()), None))
    dept_id = department["id"]
    now = datetime.now(timezone.utc)

    # DB row may pre-exist if create_dispatch happened first; keep consistent.
    task_ids: list[int] = []
    event_ids: list[int] = []

    def tick(msg: str) -> None:
        log(msg)

    if not lead:
        db.finish_dispatch(dispatch_id, "error", "No crew lead available.", [], [])
        return

    db.add_activity(f"{lead['name']} took the brief: “{goal}”.", "dispatch", dept_id, lead["id"])

    if process == "hierarchical":
        open_msg = f"Hierarchical kickoff — {lead['name']} plans, then the crew executes."
    else:
        open_msg = f"Sequential kickoff — the crew works the brief in order."
    tick(open_msg)

    # Lead opens the brief (this is the only real "planning" prose pass).
    lead_open = brain.speak(
        lead,
        "Open this brief for the department and set the plan.",
        goal, tone="open",
    )
    tick(f"{lead['name']} opened the brief: {goal}")

    # A kickoff/review checkpoint is scheduled by the lead (calendar tool).
    review_at = now + timedelta(days=2)
    event_id = db.create_event({
        "title": f"Review — {goal[:48]}{'…' if len(goal) > 48 else ''}",
        "start": _ts(review_at.replace(minute=0)),
        "end": _ts((review_at + timedelta(minutes=45)).replace(minute=0)),
        "kind": "review",
        "department_id": dept_id,
        "owner_id": lead["id"],
        "note": f"Review checkpoint for the crew kickoff. Goal: {goal}",
        "source": f"dispatch:{dispatch_id}",
    })
    event_ids.append(event_id)
    tick(f"{lead['name']} blocked a review checkpoint on the calendar for +2 days.")

    db.remember(lead["id"], "assistant", lead_open)

    plan = plan_dispatch(department["key"], goal)
    summary_lines: list[str] = [f"**Brief** — “{goal}”", ""]

    for item in plan:
        agent = agents.get(item["assignee_key"])
        if not agent:
            agent = lead  # fallback
        # Workstream created on the ops board, assigned to the specialist.
        due = now + timedelta(days=int(item.get("offset_days", 0)) + 1)
        task_id = db.create_task({
            "title": item["title"],
            "description": item["detail"],
            "department_id": dept_id,
            "assignee_id": agent["id"],
            "status": "review",          # produced, awaiting founder sign-off
            "priority": "medium",
            "due_date": _ts(due),
            "source": f"dispatch:{dispatch_id}",
        })
        task_ids.append(task_id)
        tick(f"{agent['name']} picked up “{item['title']}” and started working.")

        # The agent executes and produces a deliverable (brain prose).
        text = brain.speak(
            agent,
            "Execute this workstream and produce your deliverable.",
            goal,
            heading=item["title"],
            task_title=item["title"],
            deliverable_kind=item.get("deliverable_kind", "research"),
        )
        db.bump_agent_runs(agent["id"])
        db.remember(agent["id"], "assistant", text)
        # Keep the deliverable attached to the task on the board.
        with db.cursor() as cur:
            cur.execute(
                "UPDATE ops_tasks SET description = description || char(10) || char(10) || ? WHERE id=?",
                (f"**Deliverable** · {text}", task_id),
            )
        db.add_activity(f"{agent['name']} delivered “{item['title']}” — awaiting your review.",
                        "task", dept_id, agent["id"])
        tick(f"{agent['name']} completed “{item['title']}” (in review).")
        summary_lines.append(f"**{item['title']}** — {agent['name']}")
        summary_lines.append(f"{_short(text, 200)}")
        summary_lines.append("")

    # Lead collects everything into a single hand-off summary.
    closing = brain.speak(
        lead, "Collect the crew's outputs into one founder-ready summary and state next steps.",
        goal, heading="Founder hand-off", task_title=goal,
    )
    summary_lines.append(f"**{lead['name']}'s hand-off**")
    summary_lines.append(closing)
    summary_lines.append("")
    summary_lines.append(f"**Next** — review the {len(task_ids)} workstreams on the Ops Board "
                         f"and join the checkpoint on the Calendar.")
    db.add_activity(f"{lead['name']} handed the crew kickoff back to you. Review on the Ops Board.",
                    "dispatch", dept_id, lead["id"])
    db.remember(lead["id"], "assistant", closing)

    db.finish_dispatch(dispatch_id, "done", "\n".join(summary_lines), task_ids, event_ids)
    tick(f"Done. {len(task_ids)} workstreams in review, checkpoint scheduled.")
