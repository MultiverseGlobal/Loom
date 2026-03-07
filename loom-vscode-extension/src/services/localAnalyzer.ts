import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export class LocalAnalyzer {
    /**
     * Analyze workspace and compare to Loom blueprint
     * @param workspacePath - Path to workspace folder
     */
    async analyze(workspacePath: string): Promise<any> {
        const components = await this.discoverComponents(workspacePath);
        const framework = await this.detectFramework(workspacePath);
        const dependencyGraph = await this.buildDependencyGraph(workspacePath, components);

        return {
            timestamp: new Date().toISOString(),
            framework,
            stats: {
                total_files: components.length,
                total_components: components.filter(c => c.type === 'component').length,
            },
            components: components.map(c => ({
                name: c.name,
                path: path.relative(workspacePath, c.path),
                type: c.type,
                imports: dependencyGraph[c.path] || []
            })),
            health_score: this.calculateHealthScore(components.length, framework),
            issues: [] // Todo: Compare against blueprint if provided
        };
    }

    private async discoverComponents(workspacePath: string): Promise<any[]> {
        const components: any[] = [];
        const srcPath = path.join(workspacePath, 'src');

        if (!fs.existsSync(srcPath)) {
            return components;
        }

        const files = this.findFiles(srcPath, ['.tsx', '.jsx', '.ts', '.js']);

        for (const file of files) {
            const name = path.basename(file, path.extname(file));
            // Simple heuristic: Capitalized = Component, otherwise Utility/Hook
            const type = /^[A-Z]/.test(name) ? 'component' : 'utility';
            components.push({ name, path: file, type });
        }

        return components;
    }

    private async buildDependencyGraph(workspacePath: string, components: any[]): Promise<Record<string, string[]>> {
        const graph: Record<string, string[]> = {};

        for (const comp of components) {
            const content = fs.readFileSync(comp.path, 'utf-8');
            const imports = this.parseImports(content);
            graph[comp.path] = imports;
        }

        return graph;
    }

    private parseImports(content: string): string[] {
        const imports: string[] = [];
        // Regex to match: import ... from '...'
        const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;

        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    private calculateHealthScore(fileCount: number, framework: string): number {
        let score = 100;
        if (framework === 'unknown') score -= 20;
        if (fileCount === 0) score = 0;
        // Placeholder logic
        return score;
    }

    private findFiles(dir: string, extensions: string[]): string[] {
        const files: string[] = [];

        if (!fs.existsSync(dir)) {
            return files;
        }

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'build') {
                    files.push(...this.findFiles(fullPath, extensions));
                }
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    private async detectFramework(workspacePath: string): Promise<string> {
        const packageJsonPath = path.join(workspacePath, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            return 'unknown';
        }

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (deps['next']) return 'nextjs';
            if (deps['react']) return 'react';
            if (deps['vue']) return 'vue';
            if (deps['svelte']) return 'svelte';
        } catch (e) {
            console.error("Failed to parse package.json", e);
        }

        return 'unknown';
    }
}
