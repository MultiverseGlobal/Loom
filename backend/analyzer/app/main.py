from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

from app.routers import structure, dependencies, refactor, generate, blueprint, deltas

app = FastAPI(
    title="Loom Analyzer",
    version="0.1.0",
    description="Static analysis + dependency inference service for Loom AI.",
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(structure.router, prefix="/analyzer/structure", tags=["structure"])
app.include_router(
    dependencies.router, prefix="/analyzer/dependencies", tags=["dependencies"]
)
app.include_router(refactor.router, prefix="/analyzer/refactor", tags=["refactor"])
app.include_router(generate.router)
app.include_router(blueprint.router, prefix="/analyzer/blueprint", tags=["blueprint"])
app.include_router(deltas.router, prefix="/analyzer/deltas", tags=["deltas"])


