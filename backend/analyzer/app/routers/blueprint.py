from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.ai_blueprint_service import AIBlueprintService
from app.services.architect_service import ArchitectService
from app.upg_models import UniversalProjectGraph
from app.services.blueprint_generator import BlueprintGenerator

router = APIRouter(
    prefix="/analyzer/blueprint",
    tags=["blueprint"],
)
generator = BlueprintGenerator()
ai_service = AIBlueprintService()
architect_service = ArchitectService()

class BlueprintRequest(BaseModel):
    type: str # 'lovable', 'figma', 'komposo', 'repository'
    payload: Dict[str, Any]
    project_name: Optional[str] = "Loom App"

class ArchitectRequest(BaseModel):
    prompt: str

@router.post("/generate", response_model=UniversalProjectGraph)
async def generate_blueprint(request: BlueprintRequest):
    """
    Generate a UPG blueprint from a source (Lovable, Figma, or Repository)
    """
    try:
        # If this is a repository scan or full project analysis, use AI.
        if request.type in ['repository', 'full-scan', 'komposo']:
            files = request.payload.get("files", [])
            if files:
                print(f"[Blueprint Router] Triggering AI Deep Scan for {len(files)} files...")
                return await ai_service.generate_from_files(files, request.project_name or "Loom App")

        # Fallback to Mock for proof-of-concept/testing if no files provided
        print(f"[Blueprint Router] Using Mock Generation for type: {request.type}")
        return generator.generate_counter_app(request.project_name or "Loom App")
        
    except Exception as e:
        print(f"[Blueprint Router] ❌ Analysis Failed: {e}")
        # Return fallback mock instead of 500 to keep the UI alive during quota/connection errors
        return generator.generate_counter_app(request.project_name or "Loom App Fallback")

@router.post("/architect", response_model=UniversalProjectGraph)
async def architect_project(request: ArchitectRequest):
    """
    Generate a complete project blueprint from a prompt.
    """
    try:
        return await architect_service.architect_project(request.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

