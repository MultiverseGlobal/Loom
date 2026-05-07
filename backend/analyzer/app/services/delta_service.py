import json
import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import google.generativeai as genai
import os

class DeltaAction(BaseModel):
    id: str
    type: str # 'refactor', 'move', 'delete', 'add'
    title: str
    description: str
    impact: str # 'high', 'medium', 'low'
    file_path: Optional[str] = None
    diff: Optional[str] = None # Proposed diff

class DeltaReport(BaseModel):
    project_id: str
    score: int
    deltas: List[DeltaAction]
    summary: str

class DeltaService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
        else:
            self.model = None

    async def analyze_deltas(self, files: List[Dict[str, str]], project_id: str) -> DeltaReport:
        """
        Analyze existing files and compare them against the 'Shift Standard' (UPG v2).
        Returns a list of proposed refactors.
        """
        if not self.model:
             # Fallback mock for testing
            return DeltaReport(
                project_id=project_id,
                score=65,
                summary="Project detected with legacy patterns. 12 architectural improvements identified.",
                deltas=[
                    DeltaAction(
                        id=str(uuid.uuid4()),
                        type="refactor",
                        title="Migrate to Next.js App Router",
                        description="Convert Pages Router structure to App Router for improved performance and SEO.",
                        impact="high"
                    ),
                    DeltaAction(
                        id=str(uuid.uuid4()),
                        type="refactor",
                        title="Standardize on Tailwind CSS",
                        description="14 files found using raw CSS/SCSS modules. Shifting to Tailwind will reduce bundle size.",
                        impact="medium"
                    )
                ]
            )

        # Prepare context for AI
        context = "\n\n".join([f"--- File: {f['path']} ---\n{f['content'][:1000]}" for f in files[:20]]) # Limit context

        system_prompt = """
# SYSTEM PROMPT: SHIFT AI DELTA ANALYZER

You are a Principal Software Engineer. Your task is to analyze an existing codebase and identify "Deltas"—specific architectural refactors needed to align the project with the "Shift Standard".

## THE SHIFT STANDARD:
1. **Architecture**: Feature-First organization in Next.js App Router.
2. **Styling**: 100% Tailwind CSS. No global CSS or modular SCSS unless necessary.
3. **Type Safety**: Strict TypeScript. No `any` types.
4. **Logic**: Business logic extracted into custom hooks or server actions.

## YOUR TASK:
1. Scan the provided file excerpts.
2. Identify violations of the Shift Standard.
3. Generate a JSON report with a list of Delta Actions.
4. For each action, provide a clear title, description, and impact level.

Output ONLY JSON.
"""

        try:
            print(f"[Delta Engine] Analyzing {len(files)} files for architectural debt...")
            response = self.model.generate_content(f"{system_prompt}\n\n{context}")
            
            if not response.text:
                raise Exception("Empty response from Gemini")

            data = json.loads(response.text)
            
            return DeltaReport(
                project_id=project_id,
                score=data.get("score", 70),
                summary=data.get("summary", "Analysis complete."),
                deltas=[DeltaAction(**d) for d in data.get("deltas", [])]
            )

        except Exception as e:
            print(f"[Delta Engine] Error during delta analysis: {e}")
            raise e
