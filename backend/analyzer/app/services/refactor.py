from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class RefactorSuggestion:
    title: str
    description: str
    files: List[str]
    confidence: float


def suggest_refactors(files: list[dict]) -> list[RefactorSuggestion]:
    suggestions: list[RefactorSuggestion] = []
    if not files:
        return suggestions

    react_files = [
        file["path"] for file in files if file["path"].endswith((".tsx", ".jsx"))
    ]
    python_files = [file["path"] for file in files if file["path"].endswith(".py")]

    if len(react_files) >= 2:
        suggestions.append(
            RefactorSuggestion(
                title="Extract shared layout primitives",
                description=(
                    "Multiple React screens share container logic. Consider factoring the "
                    "grid and metric cards into `/components/layout/` to ease theming."
                ),
                files=react_files[:3],
                confidence=0.72,
            )
        )

    if any("useState" in file["content"] for file in files):
        suggestions.append(
            RefactorSuggestion(
                title="Adopt state machine for complex flows",
                description=(
                    "Large component state threatens maintainability. Use Zustand or "
                    "XState to clarify pipeline status transitions and reduce prop drilling."
                ),
                files=react_files[:2] if react_files else [],
                confidence=0.63,
            )
        )

    if any("async def" in file["content"] for file in files) and len(python_files) > 0:
        suggestions.append(
            RefactorSuggestion(
                title="Split analyzer routers into modules",
                description=(
                    "FastAPI router files are growing; move business logic into `/services` "
                    "and keep routers thin for readability."
                ),
                files=python_files[:2],
                confidence=0.68,
            )
        )

    return suggestions

