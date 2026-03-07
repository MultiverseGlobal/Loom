import {
    UniversalProjectGraph,
    UPGNode,
    UPGComponent,
    UPGElement,
    UPGText,
    UPGProp,
    UPGImport
} from "../upg/schema";
import { v4 as uuidv4 } from 'uuid';

/**
 * Loveable JSON structure (simplified mock)
 * Based on typical Loveable export format
 */
interface LoveableNode {
    type: 'component' | 'element' | 'text';
    name?: string;
    tag?: string;
    props?: Record<string, any>;
    children?: LoveableNode[];
    text?: string;
}

interface LoveableProject {
    name: string;
    framework: 'react' | 'vue' | 'html';
    components: LoveableComponent[];
}

interface LoveableComponent {
    name: string;
    props?: Record<string, any>;
    tree: LoveableNode;
    imports?: { module: string; items: string[] }[];
}

/**
 * Adapter to convert Loveable JSON format to Universal Project Graph
 */
export class LoveableAdapter {
    /**
     * Converts Loveable JSON to UPG
     */
    public toUPG(loveableData: LoveableProject): UniversalProjectGraph {
        // For MVP, we'll convert the first component
        const mainComponent = loveableData.components[0];
        if (!mainComponent) {
            throw new Error("No components found in Loveable project");
        }

        const rootId = uuidv4();
        const nodes: Record<string, UPGNode> = {};

        // Convert imports
        const imports: UPGImport[] = (mainComponent.imports || []).map(imp => {
            const defaultImport = imp.items.find(item => !item.includes('{'));
            const namedImports = imp.items
                .filter(item => item.includes('{'))
                .map(item => item.replace(/[{}]/g, '').trim());

            return {
                module: imp.module,
                default: defaultImport,
                named: namedImports.length > 0 ? namedImports : undefined
            };
        });

        // Convert props
        const props: Record<string, UPGProp> = {};
        if (mainComponent.props) {
            Object.entries(mainComponent.props).forEach(([key, value]) => {
                props[key] = {
                    name: key,
                    type: typeof value,
                    defaultValue: value,
                    required: false
                };
            });
        }

        // Parse the component tree
        const rootElement = this.parseLoveableNode(mainComponent.tree, nodes);
        if (!rootElement) {
            throw new Error("Failed to parse component tree");
        }

        // Create Component Node
        const componentNode: UPGComponent = {
            id: rootId,
            type: 'component',
            name: mainComponent.name,
            children: [rootElement.id],
            props,
            state: {},
            imports
        };
        nodes[rootId] = componentNode;

        // Set parent for root element
        nodes[rootElement.id].parent = rootId;

        return {
            id: uuidv4(),
            version: "1.0.0",
            rootComponentId: rootId,
            nodes
        };
    }

    private parseLoveableNode(
        loveableNode: LoveableNode,
        nodes: Record<string, UPGNode>
    ): UPGNode | null {
        const id = uuidv4();

        if (loveableNode.type === 'element') {
            const childrenIds: string[] = [];

            if (loveableNode.children) {
                loveableNode.children.forEach(child => {
                    const childNode = this.parseLoveableNode(child, nodes);
                    if (childNode) {
                        childNode.parent = id;
                        childrenIds.push(childNode.id);
                    }
                });
            }

            const elementNode: UPGElement = {
                id,
                type: 'element',
                tag: loveableNode.tag || 'div',
                props: loveableNode.props || {},
                children: childrenIds,
                className: loveableNode.props?.className
            };

            nodes[id] = elementNode;
            return elementNode;
        }
        else if (loveableNode.type === 'text') {
            const textNode: UPGText = {
                id,
                type: 'text',
                content: loveableNode.text || '',
                children: []
            };
            nodes[id] = textNode;
            return textNode;
        }

        return null;
    }

    /**
     * Converts UPG back to Loveable JSON format
     */
    public toLoveable(upg: UniversalProjectGraph): LoveableProject {
        const rootComponent = upg.nodes[upg.rootComponentId] as UPGComponent;
        if (!rootComponent) {
            throw new Error("Root component not found");
        }

        // Convert imports back
        const imports = rootComponent.imports.map(imp => ({
            module: imp.module,
            items: [
                ...(imp.default ? [imp.default] : []),
                ...(imp.named || []).map(n => `{ ${n} }`)
            ]
        }));

        // Convert tree
        const rootElementId = rootComponent.children[0];
        const tree = this.generateLoveableNode(rootElementId, upg.nodes);

        return {
            name: rootComponent.name + ' Project',
            framework: 'react',
            components: [
                {
                    name: rootComponent.name,
                    props: this.convertProps(rootComponent.props),
                    tree: tree as LoveableNode,
                    imports
                }
            ]
        };
    }

    private generateLoveableNode(
        nodeId: string,
        nodes: Record<string, UPGNode>
    ): LoveableNode | null {
        const node = nodes[nodeId];
        if (!node) return null;

        if (node.type === 'element') {
            const el = node as UPGElement;
            const children = el.children
                .map(childId => this.generateLoveableNode(childId, nodes))
                .filter(Boolean) as LoveableNode[];

            return {
                type: 'element',
                tag: el.tag,
                props: el.props,
                children
            };
        }
        else if (node.type === 'text') {
            const textNode = node as UPGText;
            return {
                type: 'text',
                text: textNode.content
            };
        }

        return null;
    }

    private convertProps(upgProps: Record<string, UPGProp>): Record<string, any> {
        const props: Record<string, any> = {};
        Object.entries(upgProps).forEach(([key, value]) => {
            props[key] = value.defaultValue;
        });
        return props;
    }

    /**
     * Creates a mock Loveable project for testing
     */
    public static createMockProject(): LoveableProject {
        return {
            name: "Button Component",
            framework: "react",
            components: [
                {
                    name: "Button",
                    props: {
                        variant: "primary",
                        size: "medium"
                    },
                    tree: {
                        type: 'element',
                        tag: 'button',
                        props: {
                            className: 'px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600',
                            type: 'button'
                        },
                        children: [
                            {
                                type: 'text',
                                text: 'Click me'
                            }
                        ]
                    },
                    imports: [
                        {
                            module: 'react',
                            items: ['React']
                        }
                    ]
                }
            ]
        };
    }
}
