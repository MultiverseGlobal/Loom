import { Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement, Node } from "ts-morph";
import {
    UniversalProjectGraph,
    UPGNode,
    UPGComponent,
    UPGElement,
    UPGText,
    UPGProp,
    UPGImport
} from "../upg/schema.js";
import { v4 as uuidv4 } from 'uuid';

export class VSCodeAdapter {
    private project: Project;

    constructor() {
        this.project = new Project({
            useInMemoryFileSystem: true,
        });
    }

    /**
     * Parses React component code into a Universal Project Graph
     */
    public toUPG(code: string, fileName: string = "Component.tsx"): UniversalProjectGraph {
        const sourceFile = this.project.createSourceFile(fileName, code, { overwrite: true });

        // 1. Find the component (default export or named export)
        // For MVP, we assume default export is the main component
        const defaultExport = sourceFile.getDefaultExportSymbol();
        let componentFunction: Node | undefined;

        if (defaultExport) {
            const declaration = defaultExport.getDeclarations()[0];
            if (Node.isFunctionDeclaration(declaration) || Node.isVariableDeclaration(declaration)) {
                componentFunction = declaration;
            }
        }

        // Fallback: find first function that looks like a component (starts with uppercase)
        if (!componentFunction) {
            componentFunction = sourceFile.getFunctions().find(f => {
                const name = f.getName();
                return name && /^[A-Z]/.test(name);
            });
        }

        if (!componentFunction) {
            throw new Error("No React component found in source file");
        }

        const componentName = Node.isFunctionDeclaration(componentFunction)
            ? componentFunction.getName() || "Anonymous"
            : "Anonymous"; // Handle variable declaration name extraction later

        const rootId = uuidv4();
        const nodes: Record<string, UPGNode> = {};

        // 2. Extract Imports
        const imports: UPGImport[] = sourceFile.getImportDeclarations().map(imp => {
            return {
                module: imp.getModuleSpecifierValue(),
                default: imp.getDefaultImport()?.getText(),
                named: imp.getNamedImports().map(ni => ni.getName())
            };
        });

        // 3. Extract Props (Basic)
        // TODO: Parse props interface
        const props: Record<string, UPGProp> = {};

        // 4. Parse JSX Tree
        let rootElement: UPGNode | null = null;

        // Find the return statement with JSX
        const returnStatements = componentFunction.getDescendantsOfKind(SyntaxKind.ReturnStatement);
        for (const ret of returnStatements) {
            const expression = ret.getExpression();
            if (expression) {
                // Handle parenthesized expression (return (...))
                let jsxNode = expression;
                if (Node.isParenthesizedExpression(expression)) {
                    jsxNode = expression.getExpression();
                }

                if (Node.isJsxElement(jsxNode) || Node.isJsxSelfClosingElement(jsxNode) || Node.isJsxFragment(jsxNode)) {
                    rootElement = this.parseJsxNode(jsxNode, nodes);
                    break; // Only parse the first returned JSX tree for now
                }
            }
        }

        if (!rootElement) {
            throw new Error("No JSX returned from component");
        }

        // Create Component Node
        const componentNode: UPGComponent = {
            id: rootId,
            type: 'component',
            name: componentName,
            children: [rootElement.id],
            props,
            state: {}, // TODO: Parse useState hooks
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

    private parseJsxNode(node: Node, nodes: Record<string, UPGNode>): UPGNode {
        const id = uuidv4();

        if (Node.isJsxElement(node)) {
            const opening = node.getOpeningElement();
            const tagName = opening.getTagNameNode().getText();
            const props = this.extractJsxProps(opening);

            const childrenIds: string[] = [];

            node.getJsxChildren().forEach(child => {
                // Skip whitespace-only text nodes
                if (Node.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces()) {
                    return;
                }

                const childNode = this.parseJsxNode(child, nodes);
                if (childNode) {
                    childNode.parent = id;
                    childrenIds.push(childNode.id);
                }
            });

            const elementNode: UPGElement = {
                id,
                type: 'element',
                tag: tagName,
                props,
                children: childrenIds,
                className: props.className // Shortcut for easy access
            };

            nodes[id] = elementNode;
            return elementNode;
        }
        else if (Node.isJsxSelfClosingElement(node)) {
            const tagName = node.getTagNameNode().getText();
            const props = this.extractJsxProps(node);

            const elementNode: UPGElement = {
                id,
                type: 'element',
                tag: tagName,
                props,
                children: []
            };

            nodes[id] = elementNode;
            return elementNode;
        }
        else if (Node.isJsxText(node)) {
            const textNode: UPGText = {
                id,
                type: 'text',
                content: node.getText(),
                children: []
            };
            nodes[id] = textNode;
            return textNode;
        }
        else if (Node.isJsxExpression(node)) {
            // Handle {variable} or {function()}
            // For now, treat as text representation of the expression
            const textNode: UPGText = {
                id,
                type: 'text',
                content: `{${node.getExpression()?.getText() || ''}}`,
                children: []
            };
            nodes[id] = textNode;
            return textNode;
        }

        throw new Error(`Unsupported JSX node type: ${node.getKindName()}`);
    }

    private extractJsxProps(node: JsxOpeningElement | JsxSelfClosingElement): Record<string, any> {
        const props: Record<string, any> = {};

        node.getAttributes().forEach(attr => {
            if (Node.isJsxAttribute(attr)) {
                const name = attr.getNameNode().getText();
                const initializer = attr.getInitializer();

                let value: any = true; // Boolean prop (e.g., <div disabled />)

                if (initializer) {
                    if (Node.isStringLiteral(initializer)) {
                        value = initializer.getLiteralValue();
                    } else if (Node.isJsxExpression(initializer)) {
                        value = initializer.getExpression()?.getText(); // Keep as string for now
                    }
                }

                props[name] = value;
            }
        });

        return props;
    }

    /**
     * Generates React component code from a Universal Project Graph
     */
    public toCode(upg: UniversalProjectGraph): string {
        const rootComponent = upg.nodes[upg.rootComponentId] as UPGComponent;
        if (!rootComponent) throw new Error("Root component not found");

        const sourceFile = this.project.createSourceFile("Generated.tsx", "", { overwrite: true });

        // 1. Add Imports
        rootComponent.imports.forEach((imp: UPGImport) => {
            sourceFile.addImportDeclaration({
                moduleSpecifier: imp.module,
                defaultImport: imp.default,
                namedImports: imp.named
            });
        });

        // 2. Create Component Function
        const func = sourceFile.addFunction({
            name: rootComponent.name,
            isExported: true,
            isDefaultExport: true,
        });

        // 3. Generate JSX
        const rootElementId = rootComponent.children[0];
        const jsxContent = this.generateJsx(rootElementId, upg.nodes);

        func.setBodyText(writer => {
            writer.write("return (");
            writer.write(jsxContent);
            writer.write(");");
        });

        return sourceFile.getFullText();
    }

    private generateJsx(nodeId: string, nodes: Record<string, UPGNode>): string {
        const node = nodes[nodeId];
        if (!node) return "";

        if (node.type === 'element') {
            const el = node as UPGElement;
            const propsString = Object.entries(el.props)
                .map(([key, value]) => {
                    if (value === true) return key;
                    if (typeof value === 'string' && !value.startsWith('{')) return `${key}="${value}"`;
                    return `${key}={${value}}`;
                })
                .join(" ");

            const openTag = propsString ? `<${el.tag} ${propsString}` : `<${el.tag}`;

            if (el.children.length === 0) {
                return `${openTag} />`;
            }

            const childrenJsx = el.children.map((childId: string) => this.generateJsx(childId, nodes)).join("");
            return `${openTag}>${childrenJsx}</${el.tag}>`;
        }
        else if (node.type === 'text') {
            return (node as UPGText).content;
        }

        return "";
    }
}
