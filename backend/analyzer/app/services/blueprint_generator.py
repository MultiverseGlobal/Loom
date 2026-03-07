import uuid
from app.upg_models import (
    UniversalProjectGraph, 
    UPGComponent, 
    UPGElement, 
    UPGText, 
    UPGImport, 
    UPGState
)

class BlueprintGenerator:
    """
    Generates a Universal Project Graph (UPG) from various inputs.
    Currently mocks a Counter App for demonstration.
    """
    
    def generate_counter_app(self, project_name: str) -> UniversalProjectGraph:
        root_id = str(uuid.uuid4())
        container_id = str(uuid.uuid4())
        title_id = str(uuid.uuid4())
        title_text_id = str(uuid.uuid4())
        count_display_id = str(uuid.uuid4())
        count_text_id = str(uuid.uuid4())
        button_group_id = str(uuid.uuid4())
        inc_btn_id = str(uuid.uuid4())
        inc_text_id = str(uuid.uuid4())
        dec_btn_id = str(uuid.uuid4())
        dec_text_id = str(uuid.uuid4())

        nodes = {}

        # Root Component
        nodes[root_id] = UPGComponent(
            id=root_id,
            name="CounterApp",
            type="component",
            children=[container_id],
            imports=[
                UPGImport(module="react", default=None, named=["useState"]),
                UPGImport(module="lucide-react", named=["Plus", "Minus"])
            ],
            state={
                "count": UPGState(name="count", type="number", defaultValue=0)
            }
        )

        # Container Div
        nodes[container_id] = UPGElement(
            id=container_id,
            tag="div",
            type="element",
            parent=root_id,
            className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-6",
            children=[title_id, count_display_id, button_group_id]
        )

        # Title
        nodes[title_id] = UPGElement(
            id=title_id,
            tag="h1",
            type="element",
            parent=container_id,
            className="text-3xl font-bold tracking-tight text-emerald-400",
            children=[title_text_id]
        )
        nodes[title_text_id] = UPGText(id=title_text_id, type="text", parent=title_id, content=f"{project_name}")

        # Count Display
        nodes[count_display_id] = UPGElement(
            id=count_display_id,
            tag="div",
            type="element",
            parent=container_id,
            className="text-8xl font-mono font-bold tabular-nums",
            children=[count_text_id]
        )
        nodes[count_text_id] = UPGText(id=count_text_id, type="text", parent=count_display_id, content="{count}")

        # Button Group
        nodes[button_group_id] = UPGElement(
            id=button_group_id,
            tag="div",
            type="element",
            parent=container_id,
            className="flex gap-4",
            children=[dec_btn_id, inc_btn_id]
        )

        # Decrement Button
        nodes[dec_btn_id] = UPGElement(
            id=dec_btn_id,
            tag="button",
            type="element",
            parent=button_group_id,
            className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700",
            props={"onClick": "() => setCount(count - 1)"},
            children=[dec_text_id]
        )
        nodes[dec_text_id] = UPGText(id=dec_text_id, type="text", parent=dec_btn_id, content="-")

        # Increment Button
        nodes[inc_btn_id] = UPGElement(
            id=inc_btn_id,
            tag="button",
            type="element",
            parent=button_group_id,
            className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20",
            props={"onClick": "() => setCount(count + 1)"},
            children=[inc_text_id]
        )
        nodes[inc_text_id] = UPGText(id=inc_text_id, type="text", parent=inc_btn_id, content="+")

        return UniversalProjectGraph(
            id=str(uuid.uuid4()),
            rootComponentId=root_id,
            nodes=nodes
        )
