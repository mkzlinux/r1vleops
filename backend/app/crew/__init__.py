"""CrewAI-inspired agent engine for the r1vleops desk.

Designed so the *concepts* mirror CrewAI (Agent, Task, Crew, kickoff, tools,
memory) but with a pluggable "brain" so it runs with zero API keys by default
(`MockBrain`) and can be swapped for a real LLM (`OpenAIBrain`) later.
"""
