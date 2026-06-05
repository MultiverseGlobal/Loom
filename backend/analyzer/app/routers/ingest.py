import os
import json
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from typing import Optional
from app.services.webflow_parser import WebflowParser
from supabase import create_client, Client

router = APIRouter(
    prefix="/analyzer/ingest",
    tags=["ingest"],
)

def get_supabase() -> Optional[Client]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if url and key:
        return create_client(url, key)
    return None

@router.post("/webflow")
async def ingest_webflow_zip(
    file: UploadFile = File(...),
    project_id: Optional[str] = Query(None, description="Loom project ID to associate this blueprint with"),
):
    """
    Ingest a Webflow export ZIP file.
    Parses the HTML and CSS to create a Draft Universal Project Graph (Blueprint).
    If project_id is provided, persists the blueprint to Supabase analyses table.
    """
    if not file.filename or not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Must be a .zip file")

    try:
        content = await file.read()
        parser = WebflowParser()
        upg = parser.parse_zip(content)
        blueprint_data = upg.model_dump()

        analysis_id = None

        # Persist to Supabase if project_id is provided
        if project_id:
            supabase = get_supabase()
            if supabase:
                try:
                    insert_result = supabase.table("analyses").insert({
                        "project_id": project_id,
                        "source": "webflow_blueprint",
                        "status": "ready",
                        "result_json": {
                            "blueprint": blueprint_data,
                            "summary": f"Webflow import: {len([n for n in blueprint_data.get('nodes', {}).values() if n.get('type') == 'component'])} components detected.",
                        }
                    }).execute()
                    if insert_result.data:
                        analysis_id = insert_result.data[0].get("id")
                    print(f"[Ingest] ✅ Blueprint saved to Supabase. analysis_id={analysis_id}")
                except Exception as db_err:
                    print(f"[Ingest] ⚠️ Supabase save failed (non-fatal): {db_err}")

        return {
            "status": "success",
            "blueprint": blueprint_data,
            "analysis_id": analysis_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
