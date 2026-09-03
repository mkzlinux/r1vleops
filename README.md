# r1vleops — Operations Desk

An internal **Operations Desk** for a solo founder running three departments of
**AI employees**. It unifies department rosters, an ops/task kanban, an internal
calendar, and a CrewAI-style orchestration engine that you can "brief" to plan
and delegate work across the crew.

```
1. INTELLIGENCE   → finance & fintech · AI, blockchain & software
2. CREATIVE STUDIO → brand, copy & design
3. SECURITY       → cybersecurity / sec-ops
```

## What's inside

| Layer   | Tech |
|---------|------|
| Backend | Python 3.11 · FastAPI · SQLite (stdlib `sqlite3`) |
| AI crew | Lightweight CrewAI-inspired engine: `Agent`, `Task`, `Crew`, tools, memory — pluggable "brain" |
| Frontend| React + TypeScript + Vite (no heavy UI framework) |
| Calendar| Built-in internal calendar, architected so a Google / CalDAV adapter can drop in |

The crew ships with a deterministic **MockBrain** so everything runs with **zero
API keys**. The same engine accepts an OpenAI-backed brain later (see
`backend/app/crew/brains.py`).

## Quickstart

### 1. Backend (API + serves the built frontend)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py          # http://localhost:8000  (or use `make serve`)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run build          # emits into ../backend/app/static
npm run dev            # dev server @5173 with /api proxied to the backend
```

For the simplest experience run `make dev` (builds the UI once, then serves
everything from one FastAPI process on **port 8000**).

## The AI employee model (CrewAI-style)

Each department has a lead plus specialist agents. A `Crew` can run a
`hierarchical` kickoff: the department lead **plans** your briefing into
concrete workstreams, then relevant agents **execute** and produce deliverables.

Core concepts in `backend/app/crew/`:

- `agents.py` — the roster: role, goal, backstory, skills, available tools.
- `brains.py` — `Brain` interface; `MockBrain` (default) and an optional real-LLM
  brain you can wire up.
- `engine.py` — `Agent`/`Task`/`Crew`/`Memory` primitives and the kickoff loop.
- `tools.py` — capability descriptors (calendar, tasks, research, memos).

## Using the desk

1. **Desk** — briefing box ("dispatch the crew"), cross-dept status, today's ops.
2. **Departments** — the three units and their AI staff & workload.
3. **Crew** — full roster of AI employees.
4. **Ops Board** — kanban of tasks, assignable to AI employees.
5. **Calendar** — events/deadlines; review & follow-ups auto-created by crew runs.

## Roadmap hooks (deliberately left open)

- Real LLM brain (`brains.py` → OpenAI etc.) — set `R1VLEOPS_LLM=openai` + a key.
- Calendar adapters (`services/calendar.py`) — a `GoogleAdapter` maps 1:1 onto
  the internal event model for later sync.
- Auth / multi-user, notifications, human-in-the-loop approvals.

> The `frontend/src` + `backend/app/crew` are the two places you'll live most.
