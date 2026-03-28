import os
import json
import uuid
import google.generativeai as genai
from typing import Dict, Any, List
from app.upg_models import UniversalProjectGraph

class AIBlueprintService:
    """
    Uses Gemini 1.5 Pro to analyze source code and generate a 
    Universal Project Graph (UPG).
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and api_key != "dummy-key":
            genai.configure(api_key=api_key)
            # Use Flash for 3x faster initial blueprint generation
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"}
            )
        else:
            self.model = None

    async def generate_from_files(self, files: List[Dict[str, str]], project_name: str) -> UniversalProjectGraph:
        if not self.model:
            raise Exception("Gemini API key not configured for AI Blueprint Service")

        # Prepare context
        context = "\n\n".join([f"--- File: {f['path']} ---\n{f['content']}" for f in files])
        
        system_prompt = f"""
You are a Staff Software Architect. Your task is to analyze the provided source code and convert it into a Universal Project Graph (UPG).

A UPG is a standardized JSON tree that represents UI components, elements, and their relationships.
Strictly follow this schema:
- `rootComponentId`: The ID of the main entry point component.
- `nodes`: A dictionary of nodes where the key is the node ID.
- Each node must have: `id`, `type` ('component', 'element', 'text'), and `parent` (except root).
- `component` nodes include: `name`, `props`, `state`, `imports`.
- `element` nodes include: `tag` (e.g., 'div', 'button'), `className`, `props`.
- `text` nodes include: `content`.

Project Name: {project_name}

Analyze the following files and return the complete UPG JSON:
"""

        try:
            print(f"[AI Blueprint] Analyzing {len(files)} files via Gemini 1.5 Pro...")
            response = self.model.generate_content(f"{system_prompt}\n\n{context}")
            
            if not response.text:
                raise Exception("Empty response from Gemini")

            data = json.loads(response.text)
            
            # Ensure the structure is valid by wrapping it in the Pydantic model
            # Note: We generate a fresh ID for the graph itself
            return UniversalProjectGraph(
                id=str(uuid.uuid4()),
                rootComponentId=data.get("rootComponentId", "root"),
                nodes=data.get("nodes", {})
            )

        except Exception as e:
            print(f"[AI Blueprint] Error during AI generation: {e}")
            raise e

    async def generate_fix(self, issue: str, current_upg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes an issue and the current graph, and returns a patched graph.
        """
        if not self.model:
            raise Exception("Gemini API key not configured")

        prompt = f"""
You are a senior developer. Fix the following issue in the provided Universal Project Graph (UPG).
Issue: {issue}

Current UPG:
{json.dumps(current_upg, indent=2)}

Return the COMPLETE updated UPG JSON with the fix applied.
"""
        try:
            response = self.model.generate_content(prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"[AI Blueprint] Fix generation failed: {e}")
            raise e
