from collections import Counter

from fastapi import APIRouter
from pydantic import BaseModel


class FileInput(BaseModel):
    path: str
    content: str


class DependencyRequest(BaseModel):
    files: list[FileInput]
    package_manager_hint: str | None = None


class DependencyResponse(BaseModel):
    package_manager: str
    dependencies: list[str]
    dev_dependencies: list[str]
    confidence: float


router = APIRouter()


@router.post("/", response_model=DependencyResponse)
async def infer_dependencies(payload: DependencyRequest):
    occurrences: Counter[str] = Counter()
    for file in payload.files:
        if "next/" in file.content or "next " in file.content:
            occurrences["next"] += 1
        if "react" in file.content:
            occurrences["react"] += 1
        if "fastapi" in file.content:
            occurrences["fastapi"] += 1
        if "flask" in file.content:
            occurrences["flask"] += 1

    package_manager = payload.package_manager_hint or (
        "npm" if any(f.path.endswith((".ts", ".tsx", ".js")) for f in payload.files) else "pip"
    )

    dependencies = [pkg for pkg, count in occurrences.items() if count > 0]
    dev_dependencies: list[str] = []

    confidence = min(1.0, len(dependencies) / 5 if dependencies else 0.2)

    return DependencyResponse(
        package_manager=package_manager,
        dependencies=dependencies,
        dev_dependencies=dev_dependencies,
        confidence=round(confidence, 2),
    )

