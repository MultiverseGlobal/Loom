from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
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
    tool_type: Optional[str] = "general" # e.g. 'lovable', 'bubble'
    scrape_method: Optional[str] = None
    fidelity_score: Optional[float] = None

class ArchitectRequest(BaseModel):
    prompt: str

@router.post("/generate", response_model=UniversalProjectGraph)
async def generate_blueprint(request: BlueprintRequest):
    """
    Generate a UPG blueprint from a source (Lovable, Figma, or Repository)
    """
    try:
        # If this is a repository scan or full project analysis, use AI.
        if request.type in ['repository', 'full-scan', 'komposo', 'figma', 'nocode', 'lovable']:
            files = request.payload.get("files", [])
            
            # Handle Figma or No-Code specialized payload
            if (request.type in ['figma', 'nocode', 'lovable']) and not files:
                node_data = request.payload.get("node_data", {})
                import json
                files = [{
                    "path": f"{request.type}_node.json",
                    "content": json.dumps(node_data, indent=2)
                }]

            if files:
                print(f"[Blueprint Router] Triggering AI Structural Refactor for {request.type}...")
                return await ai_service.generate_from_files(
                    files, 
                    request.project_name or "Loom App",
                    tool_type=request.type,
                    scrape_method=request.scrape_method,
                    fidelity_score=request.fidelity_score
                )


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

@router.post("/generate/stream")
async def generate_blueprint_stream(request: BlueprintRequest):
    """
    Stream the blueprint generation process and files.
    """
    async def event_generator():
        try:
            yield json.dumps({"status": "starting", "message": f"Initializing {request.type} analysis..."}) + "\n"
            
            files = request.payload.get("files", [])
            if (request.type in ['figma', 'nocode', 'lovable']) and not files:
                node_data = request.payload.get("node_data", {})
                files = [{
                    "path": f"{request.type}_node.json",
                    "content": json.dumps(node_data, indent=2)
                }]

            if not files:
                # Fallback to mock if no files
                upg = generator.generate_counter_app(request.project_name or "Loom App")
            else:
                yield json.dumps({"status": "analyzing", "message": "Neural engine is refactoring structure..."}) + "\n"
                upg = await ai_service.generate_from_files(
                    files, 
                    request.project_name or "Loom App",
                    tool_type=request.type,
                    scrape_method=request.scrape_method,
                    fidelity_score=request.fidelity_score
                )

            # Stream the nodes (files) one by one
            file_nodes = {k: v for k, v in upg.nodes.items() if v.type == 'file'}
            other_nodes = {k: v for k, v in upg.nodes.items() if v.type != 'file'}

            # Send metadata first
            yield json.dumps({
                "status": "metadata", 
                "data": {
                    "id": upg.id,
                    "project": upg.project.dict() if upg.project else None,
                    "file_tree": upg.file_tree,
                    "rootComponentId": upg.rootComponentId
                }
            }) + "\n"

            # Send non-file nodes
            for node_id, node in other_nodes.items():
                yield json.dumps({"type": "node", "id": node_id, "data": node.dict()}) + "\n"
                await asyncio.sleep(0.01)

            # Send file nodes (the heavy stuff)
            for node_id, node in file_nodes.items():
                yield json.dumps({"type": "file", "id": node_id, "path": node.path, "data": node.dict()}) + "\n"
                await asyncio.sleep(0.05) # Simulate processing time

            yield json.dumps({"status": "complete", "message": "Neural Bridge ingestion finalized."}) + "\n"

        except Exception as e:
            print(f"[Blueprint Stream] ❌ Error: {e}")
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

