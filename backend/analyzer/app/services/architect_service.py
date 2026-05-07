import os
import json
import uuid
import google.generativeai as genai
from typing import Dict, Any, List
from app.upg_models import UniversalProjectGraph, ProjectMetadata

class ArchitectService:
    """
    Uses Gemini 1.5 Pro to architect an entire project from a prompt.
    Generates a Project-Level Universal Project Graph (UPG).
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and api_key != "dummy-key":
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash", # Use Flash for speed in MVP
                generation_config={"response_mime_type": "application/json"}
            )
        else:
            self.model = None

    async def architect_project(self, prompt: str) -> UniversalProjectGraph:
        if not self.model:
            raise Exception("Gemini API key not configured for Architect Service")

        system_prompt = """
# SYSTEM PROMPT: SHIFT AI ARCHITECT

You are a Staff Software Architect at Shift AI. Your goal is to convert a user's product idea into a Universal Project Graph (UPG).

## RULES FOR GENERATION:
1. **Output ONLY JSON**: No conversational text.
2. **Architecture**: Use a clean, modular Next.js 14 App Router structure.
3. **Styling**: Use Tailwind CSS exclusively.
4. **Logic**: Identify necessary state management (React Hooks) and include it in the `content` of the files.
5. **Types**: Use TypeScript for all files.

## UPG STRUCTURE GUIDELINES:
- **project**: metadata including name, framework, and dependencies.
- **file_tree**: A recursive dictionary representing the directory structure. Leaf nodes should be node IDs.
- **nodes**: For every entry in the `file_tree`, create a node with `type: "file"`.
- Each file node must have: `id`, `path`, and the full `content` (source code).
- **Utility Nodes**: Always include a `src/lib/utils.ts` for Tailwind merging (clsx + tailwind-merge).

## EXPECTED JSON SCHEMA:
{
  "project": {
    "name": "string",
    "description": "string",
    "framework": "nextjs-tailwind-typescript",
    "dependencies": { "package-name": "version" }
  },
  "file_tree": {
    "src": {
      "app": {
        "page.tsx": "node_id_1"
      }
    }
  },
  "nodes": {
    "node_id_1": {
      "id": "node_id_1",
      "type": "file",
      "path": "src/app/page.tsx",
      "content": "string"
    }
  }
}
"""

        try:
            print(f"[Architect Service] Synthesizing architecture for: {prompt[:50]}...")
            response = self.model.generate_content(f"{system_prompt}\n\nUser request: {prompt}")
            
            if not response.text:
                raise Exception("Empty response from Gemini")

            data = json.loads(response.text)
            
            # Ensure the structure is valid
            return UniversalProjectGraph(
                id=str(uuid.uuid4()),
                project=ProjectMetadata(**data.get("project", {})),
                file_tree=data.get("file_tree", {}),
                nodes=data.get("nodes", {})
            )

        except Exception as e:
            print(f"[Architect Service] Error during synthesis: {e}")
            raise e
