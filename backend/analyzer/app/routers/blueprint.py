from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.blueprint_generator import BlueprintGenerator
from app.upg_models import UniversalProjectGraph

router = APIRouter()
generator = BlueprintGenerator()

class BlueprintRequest(BaseModel):
    type: str # 'lovable', 'figma', 'komposo'
    payload: Dict[str, Any]
    project_name: Optional[str] = "Loom App"

@router.post("/generate", response_model=UniversalProjectGraph)
async def generate_blueprint(request: BlueprintRequest):
    """
    Generate a UPG blueprint from a source (Lovable, Figma, etc.)
    """
    try:
        # In a real implementation, we would inspect request.type and payload
        # and use different generation strategies (or call LLM).
        # For Phase 1/2, we return a standardized Counter App to prove the pipeline.
        
        return generator.generate_counter_app(request.project_name or "Loom App")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
