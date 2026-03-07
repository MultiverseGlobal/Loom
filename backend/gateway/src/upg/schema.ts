export type UPGNodeType = 'component' | 'element' | 'text' | 'style' | 'prop' | 'state';

export interface UPGNode {
    id: string;
    type: UPGNodeType;
    name?: string;
    parent?: string;
    children: string[];
    metadata?: Record<string, any>;
}

export interface UPGComponent extends UPGNode {
    type: 'component';
    name: string; // e.g., "Button"
    props: Record<string, UPGProp>;
    state: Record<string, UPGState>;
    imports: UPGImport[];
}

export interface UPGElement extends UPGNode {
    type: 'element';
    tag: string; // e.g., "div", "span", "button"
    props: Record<string, any>; // HTML attributes + custom props
    className?: string; // Tailwind classes
}

export interface UPGText extends UPGNode {
    type: 'text';
    content: string;
}

export interface UPGProp {
    name: string;
    type: string; // "string", "number", "boolean", "function"
    defaultValue?: any;
    required: boolean;
}

export interface UPGState {
    name: string;
    type: string;
    defaultValue?: any;
}

export interface UPGImport {
    module: string; // "react", "lucide-react"
    default?: string;
    named?: string[];
}

export interface UniversalProjectGraph {
    id: string;
    version: string;
    rootComponentId: string;
    nodes: Record<string, UPGNode>;
}
