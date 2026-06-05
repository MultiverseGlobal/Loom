import os
import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai

router = APIRouter(
    prefix="/analyzer/ingest",
    tags=["generate-webflow"],
)


class GenerateWebflowRequest(BaseModel):
    project_id: str
    analysis_id: Optional[str] = None


def get_supabase():
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        if url and key:
            return create_client(url, key)
    except Exception as e:
        print(f"[GenerateWebflow] Supabase init failed: {e}")
    return None


def _build_component_prompt(component_name: str, children_summary: str, project_name: str) -> str:
    return f"""You are an expert React/Next.js developer converting a Webflow design to code.

Project: {project_name}
Component: {component_name}

Child elements detected:
{children_summary}

Generate a production-quality React functional component named `{component_name}` using:
- TypeScript
- Tailwind CSS for all styling (no inline styles)
- Next.js compatible (use "use client" only if needed for interactivity)
- Semantic HTML5 elements
- Responsive design (mobile-first)

Return ONLY a JSON object with this exact shape:
{{
  "code": "// Full component source code here",
  "explanation": "One sentence describing what this component does"
}}"""


async def _generate_component_gemini(component_name: str, children_summary: str, project_name: str) -> tuple[str, str]:
    """Generate a React component using Gemini. Returns (code, explanation)."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise ValueError("No Gemini API key configured")

    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config={"response_mime_type": "application/json"},
    )
    prompt = _build_component_prompt(component_name, children_summary, project_name)
    result = model.generate_content(prompt)
    data = json.loads(result.text)
    return data.get("code", ""), data.get("explanation", "")


def _summarise_node(node: dict, nodes: dict, depth: int = 0, max_depth: int = 3) -> str:
    """Recursively build a text summary of a UPG node for the LLM prompt."""
    if depth > max_depth:
        return ""
    indent = "  " * depth
    node_type = node.get("type", "")
    tag = node.get("tag", "")
    cls = node.get("className", "")
    content = node.get("content", "")
    name = node.get("name", "")

    if node_type == "text":
        return f"{indent}- text: \"{content[:80]}\"\n" if content.strip() else ""
    if node_type == "component":
        line = f"{indent}- <{name} /> (component)\n"
    else:
        label = f"<{tag}" if tag else "<div"
        if cls:
            label += f' class="{cls[:60]}"'
        label += ">"
        line = f"{indent}- {label}\n"

    children = node.get("children", [])
    child_lines = ""
    for child_id in children[:8]:  # cap to 8 children for prompt length
        child_node = nodes.get(child_id)
        if child_node:
            child_lines += _summarise_node(child_node, nodes, depth + 1, max_depth)

    return line + child_lines


@router.post("/generate-webflow")
async def generate_webflow_code(request: GenerateWebflowRequest):
    """
    SSE endpoint. Reads the stored Webflow blueprint for a project,
    then streams React component generation progress event by event.
    """
    supabase = get_supabase()

    # --- Load blueprint from Supabase ---
    blueprint = None
    project_name = "Webflow Project"

    if supabase and request.analysis_id:
        try:
            res = supabase.table("analyses").select("result_json").eq("id", request.analysis_id).single().execute()
            if res.data:
                blueprint = res.data["result_json"].get("blueprint")
        except Exception as e:
            print(f"[GenerateWebflow] Failed to load by analysis_id: {e}")

    if not blueprint and supabase:
        try:
            res = (
                supabase.table("analyses")
                .select("result_json")
                .eq("project_id", request.project_id)
                .eq("source", "webflow_blueprint")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data:
                blueprint = res.data[0]["result_json"].get("blueprint")
        except Exception as e:
            print(f"[GenerateWebflow] Failed to load by project_id: {e}")

    if not blueprint:
        raise HTTPException(status_code=404, detail="No Webflow blueprint found for this project. Please upload a Webflow ZIP first.")

    nodes: dict = blueprint.get("nodes", {})
    root_id: str = blueprint.get("rootComponentId", "")
    root_node = nodes.get(root_id, {})
    project_meta = blueprint.get("project", {})
    project_name = project_meta.get("name", "Webflow Project") if project_meta else "Webflow Project"

    # Collect top-level component IDs (direct children of root App component)
    component_ids = root_node.get("children", [])
    components = [(cid, nodes[cid]) for cid in component_ids if cid in nodes and nodes[cid].get("type") == "component"]

    if not components:
        # Fallback: collect all component nodes
        components = [(nid, n) for nid, n in nodes.items() if n.get("type") == "component" and n.get("name") != "App"]

    async def event_stream():
        total = len(components)
        generated_files = []

        yield f"data: {json.dumps({'event': 'start', 'total': total, 'projectName': project_name})}\n\n"
        await asyncio.sleep(0.05)

        for i, (comp_id, comp_node) in enumerate(components):
            comp_name = comp_node.get("name", f"Component{i+1}")

            yield f"data: {json.dumps({'event': 'progress', 'component': comp_name, 'status': 'generating', 'index': i, 'total': total})}\n\n"
            await asyncio.sleep(0.05)

            try:
                # Build a summary of the component's structure for the LLM
                children_summary = _summarise_node(comp_node, nodes)

                code, explanation = await _generate_component_gemini(comp_name, children_summary, project_name)

                file_path = f"components/{comp_name}.tsx"
                generated_files.append({"name": comp_name, "path": file_path, "code": code, "explanation": explanation})

                # Persist the generated file to Supabase project_files table
                if supabase:
                    try:
                        supabase.table("project_files").upsert({
                            "project_id": request.project_id,
                            "file_path": file_path,
                            "type": "component",
                            "content": code,
                        }, on_conflict="project_id,file_path").execute()
                    except Exception as db_err:
                        print(f"[GenerateWebflow] File save failed for {comp_name}: {db_err}")

                yield f"data: {json.dumps({'event': 'progress', 'component': comp_name, 'status': 'done', 'index': i, 'total': total, 'explanation': explanation})}\n\n"

            except Exception as e:
                print(f"[GenerateWebflow] ❌ Failed generating {comp_name}: {e}")
                # Emit a placeholder file on failure
                fallback_code = f"""// Auto-generated placeholder for {comp_name}
export default function {comp_name}() {{
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold">{comp_name}</h2>
      </div>
    </section>
  );
}}"""
                generated_files.append({"name": comp_name, "path": f"components/{comp_name}.tsx", "code": fallback_code})
                yield f"data: {json.dumps({'event': 'progress', 'component': comp_name, 'status': 'fallback', 'index': i, 'total': total, 'error': str(e)})}\n\n"

            await asyncio.sleep(0.1)

        # Also generate a root page.tsx that imports all components
        page_imports = "\n".join([f"import {{ default as {f['name']} }} from '@/components/{f['name']}';" for f in generated_files])
        page_components = "\n        ".join([f"<{f['name']} />" for f in generated_files])
        page_code = f"""// Auto-generated by Loom — {project_name}
{page_imports}

export default function HomePage() {{
  return (
    <main>
        {page_components}
    </main>
  );
}}
"""
        if supabase:
            try:
                supabase.table("project_files").upsert({
                    "project_id": request.project_id,
                    "file_path": "app/page.tsx",
                    "type": "page",
                    "content": page_code,
                }, on_conflict="project_id,file_path").execute()
            except Exception as db_err:
                print(f"[GenerateWebflow] page.tsx save failed: {db_err}")

        yield f"data: {json.dumps({'event': 'complete', 'total': total, 'files': [f['path'] for f in generated_files]})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
