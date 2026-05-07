from typing import Literal, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

UPGNodeType = Literal['component', 'element', 'text', 'style', 'prop', 'state', 'file']

class ProjectMetadata(BaseModel):
    name: str
    description: Optional[str] = None
    framework: str = "nextjs-tailwind-typescript"
    dependencies: Dict[str, str] = Field(default_factory=dict)
    version: str = "1.0.0"

class FileTreeNode(BaseModel):
    """
    Recursive structure for representing the file system.
    Value can be a string (node ID) for files, or another dict for directories.
    """
    nodes: Dict[str, Union[str, Dict[str, Any]]] = Field(default_factory=dict)

class UPGNode(BaseModel):
    id: str
    type: UPGNodeType
    name: Optional[str] = None
    parent: Optional[str] = None
    children: List[str] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

class UPGProp(BaseModel):
    name: str
    type: str
    defaultValue: Optional[Any] = None
    required: bool

class UPGState(BaseModel):
    name: str
    type: str
    defaultValue: Optional[Any] = None

class UPGImport(BaseModel):
    module: str
    default: Optional[str] = None
    named: Optional[List[str]] = None

class UPGComponent(UPGNode):
    type: Literal['component'] = 'component'
    name: str
    props: Dict[str, UPGProp] = Field(default_factory=dict)
    state: Dict[str, UPGState] = Field(default_factory=dict)
    imports: List[UPGImport] = Field(default_factory=list)

class UPGElement(UPGNode):
    type: Literal['element'] = 'element'
    tag: str
    props: Dict[str, Any] = Field(default_factory=dict)
    className: Optional[str] = None

class UPGText(UPGNode):
    type: Literal['text'] = 'text'
    content: str

class UPGFile(UPGNode):
    """
    Represents a full file in the project.
    """
    type: Literal['file'] = 'file'
    path: str
    content: str
    language: str = "typescript"

class UniversalProjectGraph(BaseModel):
    id: str
    version: str = "1.0.0"
    project: Optional[ProjectMetadata] = None
    file_tree: Optional[Dict[str, Any]] = Field(default_factory=dict)
    rootComponentId: Optional[str] = None
    nodes: Dict[str, Union[UPGComponent, UPGElement, UPGText, UPGFile, UPGNode]]

