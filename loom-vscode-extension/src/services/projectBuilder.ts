import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { UniversalProjectGraph, UPGComponent, UPGElement, UPGText, UPGNode } from '../types/upg';

export class ProjectBuilder {
    /**
     * Build a project from UPG format into the filesystem
     * @param upg - Universal Project Graph
     * @param projectName - Name of the project
     * @returns Path to the created project
     */
    async buildFromUPG(upg: UniversalProjectGraph, projectName: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('loom');
        let projectsDir = config.get<string>('projectsDirectory') || '~/loom-projects';

        // Expand ~ to home directory
        if (projectsDir.startsWith('~')) {
            projectsDir = path.join(os.homedir(), projectsDir.slice(1));
        }

        // Create projects directory if it doesn't exist
        if (!fs.existsSync(projectsDir)) {
            fs.mkdirSync(projectsDir, { recursive: true });
        }

        const projectPath = path.join(projectsDir, projectName);

        // Create project directory
        if (fs.existsSync(projectPath)) {
            // Ask user if they want to overwrite
            const answer = await vscode.window.showWarningMessage(
                `Project "${projectName}" already exists. Overwrite?`,
                'Yes', 'No'
            );
            if (answer !== 'Yes') {
                throw new Error('Project creation cancelled');
            }
            fs.rmSync(projectPath, { recursive: true, force: true });
        }

        fs.mkdirSync(projectPath, { recursive: true });

        // Create src directory
        const srcPath = path.join(projectPath, 'src');
        fs.mkdirSync(srcPath, { recursive: true });

        const componentsPath = path.join(srcPath, 'components');
        fs.mkdirSync(componentsPath, { recursive: true });

        // Generate files from UPG
        await this.generateFilesFromUPG(upg, projectPath, srcPath, componentsPath);

        // Create package.json
        await this.createPackageJson(upg, projectPath, projectName);

        // Create tsconfig.json
        await this.createTsConfig(projectPath);

        // Create README
        await this.createReadme(projectPath, projectName);

        return projectPath;
    }

    /**
     * Generate component files from UPG
     */
    private async generateFilesFromUPG(
        upg: UniversalProjectGraph,
        projectPath: string,
        srcPath: string,
        componentsPath: string
    ): Promise<void> {
        const rootComponent = upg.nodes[upg.rootComponentId] as UPGComponent;

        if (!rootComponent) {
            throw new Error('Root component not found in UPG');
        }

        // Generate main component file
        const componentCode = this.generateComponentCode(rootComponent, upg.nodes);
        const componentFile = path.join(componentsPath, `${rootComponent.name}.tsx`);
        fs.writeFileSync(componentFile, componentCode, 'utf-8');

        // Generate an App.tsx that uses the root component
        const appCode = this.generateAppCode(rootComponent.name);
        fs.writeFileSync(path.join(srcPath, 'App.tsx'), appCode, 'utf-8');

        // Generate index files
        const indexHtml = this.generateIndexHtml(projectPath);
        fs.writeFileSync(path.join(projectPath, 'index.html'), indexHtml, 'utf-8');

        const main = this.generateMainTsx();
        fs.writeFileSync(path.join(srcPath, 'main.tsx'), main, 'utf-8');
    }

    /**
     * Generate React component code from UPG component
     */
    private generateComponentCode(component: UPGComponent, nodes: Record<string, UPGNode>): string {
        const imports = component.imports.map(imp => {
            if (imp.default && imp.named) {
                return `import ${imp.default}, { ${imp.named.join(', ')} } from '${imp.module}';`;
            } else if (imp.default) {
                return `import ${imp.default} from '${imp.module}';`;
            } else if (imp.named) {
                return `import { ${imp.named.join(', ')} } from '${imp.module}';`;
            }
            return `import '${imp.module}';`;
        }).join('\n');

        const propsInterface = Object.keys(component.props).length > 0
            ? `interface ${component.name}Props {\n${Object.entries(component.props)
                .map(([key, prop]) => `  ${key}${prop.required ? '' : '?'}: ${prop.type};`)
                .join('\n')}\n}\n\n`
            : '';

        const propsParam = Object.keys(component.props).length > 0
            ? `props: ${component.name}Props`
            : '';

        const jsx = this.generateJSX(component.children[0], nodes);

        return `${imports}\n\n${propsInterface}export default function ${component.name}(${propsParam}) {\n  return (\n${jsx}\n  );\n}\n`;
    }

    /**
     * Generate JSX from UPG nodes
     */
    private generateJSX(nodeId: string, nodes: Record<string, UPGNode>, indent = 4): string {
        const node = nodes[nodeId];
        if (!node) return '';

        const indentStr = ' '.repeat(indent);

        if (node.type === 'element') {
            const el = node as UPGElement;
            const props = Object.entries(el.props)
                .map(([key, value]) => {
                    if (typeof value === 'boolean' && value === true) {
                        return key;
                    }
                    if (typeof value === 'string') {
                        return `${key}="${value}"`;
                    }
                    return `${key}={${JSON.stringify(value)}}`;
                })
                .join(' ');

            const propsStr = props ? ` ${props}` : '';

            if (el.children.length === 0) {
                return `${indentStr}<${el.tag}${propsStr} />`;
            }

            const childrenJsx = el.children
                .map(childId => this.generateJSX(childId, nodes, indent + 2))
                .join('\n');

            return `${indentStr}<${el.tag}${propsStr}>\n${childrenJsx}\n${indentStr}</${el.tag}>`;
        } else if (node.type === 'text') {
            const textNode = node as UPGText;
            return `${indentStr}${textNode.content}`;
        }

        return '';
    }

    /**
     * Create package.json
     */
    private async createPackageJson(upg: UniversalProjectGraph, projectPath: string, projectName: string): Promise<void> {
        const packageJson = {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
            version: '0.1.0',
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview'
            },
            dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0'
            },
            devDependencies: {
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                '@vitejs/plugin-react': '^4.0.0',
                typescript: '^5.0.0',
                vite: '^4.3.0'
            }
        };

        fs.writeFileSync(
            path.join(projectPath, 'package.json'),
            JSON.stringify(packageJson, null, 2),
            'utf-8'
        );
    }

    /**
     * Create tsconfig.json
     */
    private async createTsConfig(projectPath: string): Promise<void> {
        const tsConfig = {
            compilerOptions: {
                target: 'ES2020',
                useDefineForClassFields: true,
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                skipLibCheck: true,
                moduleResolution: 'bundler',
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: 'react-jsx',
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true,
                noFallthroughCasesInSwitch: true
            },
            include: ['src'],
            references: [{ path: './tsconfig.node.json' }]
        };

        fs.writeFileSync(
            path.join(projectPath, 'tsconfig.json'),
            JSON.stringify(tsConfig, null, 2),
            'utf-8'
        );
    }

    private generateAppCode(componentName: string): string {
        return `import ${componentName} from './components/${componentName}';\n\nfunction App() {\n  return <${componentName} />;\n}\n\nexport default App;\n`;
    }

    private generateIndexHtml(projectPath: string): string {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loom Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    }

    private generateMainTsx(): string {
        return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    }

    private async createReadme(projectPath: string, projectName: string): Promise<void> {
        const readme = `# ${projectName}

Generated by Loom AI

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`;
        fs.writeFileSync(path.join(projectPath, 'README.md'), readme, 'utf-8');
    }
}
