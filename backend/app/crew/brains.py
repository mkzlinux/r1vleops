"""Brain abstraction.

A `Brain` is whatever turns a task into text. Ship with a deterministic
`MockBrain` so the whole desk runs keyless; keep an `OpenAIBrain` for later so a
real LLM can be dropped in by setting `R1VLEOPS_LLM=openai` and an API key.

Real-CrewAI note: if you'd rather delegate this to CrewAI itself, the code you
would replace is in `engine.py` — this file only produces prose.
"""
from __future__ import annotations

from .. import config


class Brain:
    name = "base"

    def speak(self, agent: dict, message: str, goal: str, **ctx) -> str:
        raise NotImplementedError


class MockBrain(Brain):
    """Deterministic pseudo-LLM.

    It reads the agent's role + skills and returns structured, believable prose
    referencing the real goal. Good enough to demo orchestration end to end.
    """

    name = "mock"

    def _signoff(self, agent: dict) -> str:
        return f"\n\n— {agent['name']}, {agent['title']}"

    def speak(self, agent: dict, message: str, goal: str, **ctx) -> str:
        first = agent["name"].split()[0]
        role = agent.get("title") or agent.get("role", "agent")
        skill = (agent.get("skills") or ["analysis"])[0]

        heading = ctx.get("heading", "Working note")
        deliverable = ctx.get("deliverable_kind", skill)
        task_title = ctx.get("task_title", goal)

        if ctx.get("tone") == "open":
            return (
                f"I've taken this on as my piece of the brief: “{goal}”. My read is that the "
                f"critical path is a clear definition of what done looks like, then one focused "
                f"pass from the team, each with an explicit expected output. I'll hand each "
                f"workstream to the right specialist and collect it back into a decision-ready "
                f"summary. Stand by for the running plan."
                + self._signoff(agent)
            )

        opening = {
            "research": f"I ran the angles on “{task_title}” from a {role.lower()} vantage point.",
            "finance": f"Costing the numbers behind “{task_title}” with a {role.lower()} lens.",
            "copywriting": f"Wrote the first real draft for “{task_title}” in {first}'s voice.",
            "design": f"Blocked out the visual direction for “{task_title}”.",
            "software": f"Read “{task_title}” as an engineering brief and produced a build plan.",
            "security": f"Approached “{task_title}” with the {skill} discipline top of mind.",
        }.get(skill, f"Took “{task_title}” through a {role.lower()} pass.")

        closing = {
            "research": "Key finding: the decisive variables are scope, timeline and the one "
                        "assumption that can break it. I've separated signal from noise and "
                        "listed the highest-value next actions.",
            "finance": "Bottom line up front: the numbers support a staged approach. I've "
                       "flagged the assumptions that need a real human's judgment before we "
                       "commit.",
            "copywriting": "First draft is tight and on-voice. It says one clear thing, has a "
                           "natural hook, and is ready for a style pass and a second opinion.",
            "design": "Direction is on-brand and shipped as a spec the studio can execute. "
                      "Fidelity pass still needed on real copy.",
            "software": "A pragmatic plan with explicit milestones and a review checkpoint. "
                        "The chosen path minimizes moving parts; the risk register is attached.",
            "security": "Everything is logged. The two items that need human eyes today are "
                        "prioritized at the top of my hand-off.",
        }.get(skill,
              f"I've completed the pass and captured the essence of “{task_title}” in the "
              f"hand-off below, prioritised so the next step is obvious.")

        return f"{opening}\n\n{closing}{self._signoff(agent)}"


class OpenAIBrain(Brain):
    """Optional real-LLM brain.

    Enabled only when R1VLEOPS_LLM=openai and OPENAI_API_KEY is present. The
    `openai` package is imported lazily so the default install stays keyless.
    """

    name = "openai"

    def __init__(self) -> None:
        try:
            from openai import OpenAI  # type: ignore
        except Exception as e:  # pragma: no cover - env dependent
            raise RuntimeError(
                "R1VLEOPS_LLM=openai requires the `openai` package: "
                "`pip install openai` and set OPENAI_API_KEY."
            ) from e
        self._client = OpenAI()
        self.model = config.OPENAI_MODEL

    def speak(self, agent: dict, message: str, goal: str, **ctx) -> str:
        system = (
            f"You are {agent['name']}, {agent['role']} on an operations desk.\n"
            f"Role/goal: {agent.get('goal','')}\n"
            f"Backstory: {agent.get('backstory','')}\n"
            "Answer the operator's instruction concisely, in first person, "
            "plain English, decision-ready. Use the actual goal text."
        )
        resp = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Goal: {goal}\n\n{message}"},
            ],
        )
        return resp.choices[0].message.content.strip()


def make_brain() -> Brain:
    if config.LLM_BACKEND == "openai":
        return OpenAIBrain()
    return MockBrain()
