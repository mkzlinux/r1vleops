"""Tool registry.

CrewAI-style capabilities available to agents. Each has a name and description.
In the mock runtime these describe what an agent *may* do (and feed the UI and
narrative). A real implementation would call the corresponding service
functions (calendar/task CRUD in `db.py`).
"""
from __future__ import annotations

TOOL_CATALOG: dict[str, str] = {
    "research": "Search and synthesize information about the goal.",
    "calendar": "Read and schedule calendar events and review checkpoints.",
    "tasks": "Create, assign and update ops tasks on the board.",
    "memo": "Store and retrieve working notes in agent memory.",
}

# Map a broad ops action -> the calendar event kind an agent would use.
EVENT_KINDS = {
    "review": "review",
    "deadline": "deadline",
    "follow_up": "follow_up",
    "meeting": "meeting",
}
