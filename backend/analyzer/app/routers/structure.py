from fastapi import APIRouter
from pydantic import BaseModel


class FileInput(BaseModel):
    path: str
    content: str


class StructureRequest(BaseModel):
    files: list[FileInput]


class StructureResponse(BaseModel):
    languages: list[str]
    entrypoints: list[str]
    warnings: list[str]


router = APIRouter()


@router.post("/", response_model=StructureResponse)
async def analyze_structure(payload: StructureRequest):
    # TODO: integrate tree-sitter + heuristics. Placeholder infers via simple extension map.
    languages = {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".py": "python",
        ".json": "json",
    }
    detected = set()
    entrypoints: list[str] = []
    warnings: list[str] = []

    for file in payload.files:
        for ext, lang in languages.items():
            if file.path.endswith(ext):
                detected.add(lang)
        if file.path.endswith(("app/main.py", "src/index.ts", "src/main.tsx")):
            entrypoints.append(file.path)

    if not payload.files:
        warnings.append("No files supplied")

    return StructureResponse(
        languages=sorted(detected),
        entrypoints=entrypoints,
        warnings=warnings,
    )

