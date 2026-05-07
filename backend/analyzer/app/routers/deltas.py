from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from app.services.delta_service import DeltaService, DeltaReport

router = APIRouter()
delta_service = DeltaService()

class DeltaScanRequest(BaseModel):
    project_id: str
    files: List[Dict[str, str]]

@router.post("/scan", response_model=DeltaReport)
async def scan_project_deltas(request: DeltaScanRequest):
    """
    Perform an architectural audit of the provided files and identify refactoring deltas.
    """
    try:
        return await delta_service.analyze_deltas(request.files, request.project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
