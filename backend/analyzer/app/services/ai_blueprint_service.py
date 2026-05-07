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

    async def generate_from_files(self, files: List[Dict[str, str]], project_name: str, tool_type: str = "general") -> UniversalProjectGraph:
        if not self.model:
            raise Exception("Gemini API key not configured for AI Blueprint Service")

        # Prepare context
        context = "\n\n".join([f"--- File: {f['path']} ---\n{f['content']}" for f in files])
        
        # Tool-specific hints
        adapter_hint = ""
        if tool_type == "lovable":
            adapter_hint = """
NOTE: This is a Lovable.dev export. It likely has a flat component structure and mixed logic. 
YOUR TASK: Refactor this into a clean 'Feature-First' architecture. 
"""
        elif tool_type == "figma":
            adapter_hint = """
NOTE: This is a Figma design export (JSON nodes). 
YOUR TASK: 
1. Convert the visual hierarchy into responsive React + Tailwind CSS components.
2. Interpret Auto-Layout (Flexbox) and map it to Tailwind classes (flex, gap, padding, etc.).
3. Identify reusable UI patterns and extract them into a `src/components/ui` folder.
4. If a node is named like a button or input, treat it as a functional component.
"""


        system_prompt = f"""
# SYSTEM PROMPT: SHIFT AI STRUCTURAL REFACTOR

You are a Staff Software Architect. Your task is to analyze the provided source code and refactor it into a clean, Universal Project Graph (UPG).

## RULES FOR REFACTORING:
1. **Output ONLY JSON**: No conversational text.
2. **Architecture**: Convert the input (often messy or flat) into a clean, modular Next.js 14 App Router structure.
3. **Styling**: Standardize on Tailwind CSS.
4. **Project Mapping**:
   - `project`: metadata including name, framework, and dependencies.
   - `file_tree`: A recursive dictionary representing the NEW repository structure.
   - `nodes`: For every entry in the `file_tree`, create a node with `type: "file"`.
   - Each file node must have: `id`, `path`, and the FULL refactored `content` (source code).

{adapter_hint}

Project Name: {project_name}

Analyze these files and return the refactored Project-Level UPG JSON:
"""

        try:
            print(f"[AI Blueprint] Refactoring {len(files)} files via Gemini 1.5 Pro...")
            response = self.model.generate_content(f"{system_prompt}\n\n{context}")
            
            if not response.text:
                raise Exception("Empty response from Gemini")

            data = json.loads(response.text)
            
            # Use the new ProjectMetadata and UniversalProjectGraph structure
            from app.upg_models import ProjectMetadata
            return UniversalProjectGraph(
                id=str(uuid.uuid4()),
                project=ProjectMetadata(**data.get("project", {})),
                file_tree=data.get("file_tree", {}),
                nodes=data.get("nodes", {})
            )

        except Exception as e:
            print(f"[AI Blueprint] Error during structural refactor: {e}")
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
