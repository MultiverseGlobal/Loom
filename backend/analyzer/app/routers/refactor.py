from fastapi import APIRouter
from pydantic import BaseModel

from app.services.refactor import RefactorSuggestion, suggest_refactors


class FileInput(BaseModel):
    path: str
    content: str


class RefactorRequest(BaseModel):
    files: list[FileInput]


class RefactorResponse(BaseModel):
    suggestions: list[RefactorSuggestion]


router = APIRouter()


@router.post("/", response_model=RefactorResponse)
async def get_refactor_suggestions(payload: RefactorRequest):
    suggestions = suggest_refactors([file.model_dump() for file in payload.files])
    return RefactorResponse(suggestions=suggestions)

