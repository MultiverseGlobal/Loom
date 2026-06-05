from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Dict, Any
from app.services.webflow_parser import WebflowParser

router = APIRouter(
    prefix="/analyzer/ingest",
    tags=["ingest"],
)

@router.post("/webflow")
async def ingest_webflow_zip(file: UploadFile = File(...)):
    """
    Ingest a Webflow export ZIP file.
    Parses the HTML and CSS to create a Draft Universal Project Graph.
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="Must be a .zip file")

    try:
        content = await file.read()
        parser = WebflowParser()
        upg = parser.parse_zip(content)
        
        return {
            "status": "success",
            "blueprint": upg.model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
