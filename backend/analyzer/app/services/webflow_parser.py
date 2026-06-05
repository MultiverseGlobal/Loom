import io
import zipfile
import uuid
import re
from bs4 import BeautifulSoup, Tag
from app.upg_models import (
    UniversalProjectGraph,
    UPGComponent,
    UPGElement,
    UPGText,
    ProjectMetadata
)

# Map semantic HTML tags or common class patterns to component names
SEMANTIC_SECTION_MAP = {
    "nav": "Navbar",
    "header": "Header",
    "footer": "Footer",
    "aside": "Sidebar",
    "main": "MainContent",
}

CLASS_PATTERN_MAP = [
    (re.compile(r'\bnav\b|\bnavbar\b|\bnavigation\b', re.IGNORECASE), "Navbar"),
    (re.compile(r'\bhero\b|\bjumbotron\b', re.IGNORECASE), "HeroSection"),
    (re.compile(r'\bfooter\b', re.IGNORECASE), "Footer"),
    (re.compile(r'\bfeature[s]?\b', re.IGNORECASE), "FeaturesSection"),
    (re.compile(r'\bpric[e|ing]\b', re.IGNORECASE), "PricingSection"),
    (re.compile(r'\btest[i]?monial[s]?\b|\breview[s]?\b', re.IGNORECASE), "TestimonialsSection"),
    (re.compile(r'\bcta\b|\bcall.to.action\b', re.IGNORECASE), "CTASection"),
    (re.compile(r'\bfaq\b', re.IGNORECASE), "FAQSection"),
    (re.compile(r'\bteam\b|\babout\b', re.IGNORECASE), "AboutSection"),
    (re.compile(r'\bblog\b|\barticle[s]?\b', re.IGNORECASE), "BlogSection"),
    (re.compile(r'\bcontact\b', re.IGNORECASE), "ContactSection"),
    (re.compile(r'\bgallery\b|\bportfolio\b', re.IGNORECASE), "GallerySection"),
    (re.compile(r'\bheader\b|\bhero\b', re.IGNORECASE), "Header"),
]

def _guess_component_name(element: Tag, index: int) -> str:
    """Try to guess a meaningful component name from the element."""
    tag = element.name.lower() if element.name else ""
    classes = " ".join(element.get("class", []))

    # Check tag-based semantic map
    if tag in SEMANTIC_SECTION_MAP:
        return SEMANTIC_SECTION_MAP[tag]

    # Check class-based patterns
    for pattern, name in CLASS_PATTERN_MAP:
        if pattern.search(classes):
            return name

    # Fallback: use role, id, or section index
    role = element.get("role", "")
    if role:
        return role.capitalize().replace("-", "") + "Section"

    elem_id = element.get("id", "")
    if elem_id:
        # Convert kebab-case to PascalCase
        parts = re.split(r"[-_\s]", elem_id)
        return "".join(p.capitalize() for p in parts if p) + "Section"

    return f"Section{index + 1}"

def _element_to_upg(element: Tag, parent_id: str, nodes: dict) -> str | None:
    """Recursively convert a BeautifulSoup element into UPG nodes."""
    # Skip script/style tags entirely
    if element.name in ("script", "style", "link", "meta"):
        return None

    # Handle text nodes
    if isinstance(element, str):
        text = element.strip()
        if not text:
            return None
        text_id = str(uuid.uuid4())
        nodes[text_id] = UPGText(id=text_id, type="text", parent=parent_id, content=text[:200])
        return text_id

    el_id = str(uuid.uuid4())
    class_name = " ".join(element.get("class", []))
    props = {}
    for attr, val in element.attrs.items():
        if attr != "class":
            props[attr] = val if isinstance(val, str) else " ".join(val)

    child_ids = []
    for child in element.children:
        child_id = _element_to_upg(child, el_id, nodes)
        if child_id:
            child_ids.append(child_id)

    nodes[el_id] = UPGElement(
        id=el_id,
        tag=element.name or "div",
        type="element",
        parent=parent_id,
        className=class_name,
        props=props,
        children=child_ids,
    )
    return el_id


class WebflowParser:
    """
    Parses a Webflow export ZIP into a Universal Project Graph (UPG).
    Identifies top-level semantic sections and maps them to named React components.
    """

    def parse_zip(self, zip_bytes: bytes) -> UniversalProjectGraph:
        index_html = ""
        css_files: list[str] = []
        pages: list[str] = []

        with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
            for name in zf.namelist():
                lower = name.lower()
                if lower.endswith("index.html") and "/" not in name.lstrip("/"):
                    index_html = zf.read(name).decode("utf-8", errors="replace")
                elif lower.endswith(".html"):
                    pages.append(name)
                elif lower.endswith(".css"):
                    css_files.append(name)

        nodes: dict = {}
        root_id = str(uuid.uuid4())

        if not index_html:
            # Return a minimal empty graph
            nodes[root_id] = UPGComponent(
                id=root_id, name="EmptyProject", type="component", children=[]
            )
            return UniversalProjectGraph(
                id=str(uuid.uuid4()),
                rootComponentId=root_id,
                nodes=nodes,
                project=ProjectMetadata(name="Untitled Webflow Project", framework="nextjs-tailwind-typescript"),
            )

        soup = BeautifulSoup(index_html, "html.parser")

        # Extract page title for project metadata
        title_tag = soup.find("title")
        project_name = title_tag.get_text(strip=True) if title_tag else "Webflow Project"

        body = soup.find("body")
        top_level_sections = []

        if body:
            for child in body.children:
                if isinstance(child, Tag):
                    top_level_sections.append(child)

        # Create one named UPGComponent per top-level section
        component_ids = []
        seen_names: dict[str, int] = {}

        for i, section in enumerate(top_level_sections):
            name = _guess_component_name(section, i)

            # De-duplicate names (e.g., two Section1s)
            if name in seen_names:
                seen_names[name] += 1
                name = f"{name}{seen_names[name]}"
            else:
                seen_names[name] = 0

            comp_id = str(uuid.uuid4())
            child_ids = []
            for child in section.children:
                child_id = _element_to_upg(child, comp_id, nodes)
                if child_id:
                    child_ids.append(child_id)

            nodes[comp_id] = UPGComponent(
                id=comp_id,
                name=name,
                type="component",
                children=child_ids,
            )
            component_ids.append(comp_id)

        # Root "App" component that wires sections together
        nodes[root_id] = UPGComponent(
            id=root_id,
            name="App",
            type="component",
            children=component_ids,
        )

        return UniversalProjectGraph(
            id=str(uuid.uuid4()),
            rootComponentId=root_id,
            nodes=nodes,
            project=ProjectMetadata(
                name=project_name,
                description=f"Imported from Webflow. {len(pages) + 1} page(s) detected. {len(css_files)} stylesheet(s) found.",
                framework="nextjs-tailwind-typescript",
            ),
        )
