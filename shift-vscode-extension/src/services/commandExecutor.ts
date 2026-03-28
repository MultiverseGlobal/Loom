import axios from 'axios';
import * as vscode from 'vscode';
import { LoomProject } from './loomService';

export interface Command {
    id: string;
    command_type: 'IMPORT_PROJECT' | 'ANALYZE_WORKSPACE' | 'SYNC_CHANGES' | 'APPLY_CHANGES';
    project_id?: string;
    payload: any;
    status: string;
    created_at: string;
}

export class CommandExecutor {
    private getConfig() {
        const config = vscode.workspace.getConfiguration('loom');
        return {
            apiKey: config.get<string>('apiKey') || '',
            apiUrl: config.get<string>('apiUrl') || 'http://localhost:4000'
        };
    }

  /**
   * Execute a command received from the backend
   */async execute(command: Command): Promise<void> {
        vscode.window.showInformationMessage(`🚀 Executing command: ${command.command_type}`);

        try {
            switch (command.command_type) {
                case 'IMPORT_PROJECT':
                    await this.importProject(command);
                    break;
                case 'ANALYZE_WORKSPACE':
                    await this.analyzeWorkspace(command);
                    break;
                case 'APPLY_CHANGES':
                    await this.applyChanges(command);
                    break;
                default:
                    throw new Error(`Unknown command type: ${command.command_type}`);
            }

            // Report success
            await this.completeCommand(command.id, { success: true });
            vscode.window.showInformationMessage(`✅ Command completed: ${command.command_type}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.completeCommand(command.id, undefined, errorMessage);
            vscode.window.showErrorMessage(`❌ Command failed: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * IMPORT_PROJECT command handler
     * Downloads project from backend and creates it in local filesystem
     */
    private async importProject(command: Command): Promise<void> {
        const { projectId, sourceUrl, projectName, isGitRepo } = command.payload;

        if (!projectId && !sourceUrl) {
            throw new Error('Missing project_id or sourceUrl in command payload');
        }

        let projectPath: string;

        // Use Git if explicitly told it's a repo, or if url ends with .git
        const useGit = sourceUrl && (isGitRepo || sourceUrl.endsWith('.git'));

        if (useGit) {
            // Option A: Clone from Git
            const { GitService } = await import('./gitService');
            const git = new GitService();
            const branch = command.payload.branch || 'main';

            vscode.window.showInformationMessage(`Cloning ${projectName || 'project'} (branch: ${branch})...`);
            projectPath = await git.cloneProject(sourceUrl, projectName || `project-${projectId}`, branch);

            // Optional: install dependencies
            const setup = await vscode.window.showInformationMessage(
                'Project cloned. Install dependencies?',
                'Yes', 'No'
            );
            if (setup === 'Yes') {
                await git.installDependencies(projectPath);
            }
        } else {
            // Option B: Build from UPG (legacy/AI-generated)
            let upgData = command.payload.upg;

            if (!upgData) {
                const { apiKey, apiUrl } = this.getConfig();
                const response = await axios.get(`${apiUrl}/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${apiKey}` }
                });
                const projectData = response.data;
                upgData = projectData.upg || projectData;
            }

            const { ProjectBuilder } = await import('./projectBuilder');
            const builder = new ProjectBuilder();

            projectPath = await builder.buildFromUPG(
                upgData,
                projectName || `project-${projectId}`
            );
        }

        // Open the created project
        const uri = vscode.Uri.file(projectPath);
        await vscode.commands.executeCommand('vscode.openFolder', uri, true);
    }

    /**
     * ANALYZE_WORKSPACE command handler
     * Analyzes current workspace and sends report to backend
     */
    private async analyzeWorkspace(command: Command): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;

        // Use LocalAnalyzer to scan workspace
        const { LocalAnalyzer } = await import('./localAnalyzer');
        const analyzer = new LocalAnalyzer();

        const analysis = await analyzer.analyze(workspacePath);

        // Send analysis report to backend
        const { apiKey, apiUrl } = this.getConfig();
        await axios.post(
            `${apiUrl}/api/projects/${command.project_id}/report`,
            { analysis },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );
    }

    /**
     * APPLY_CHANGES command handler
     * Applies changes from web app to local files
     */
    private async applyChanges(command: Command): Promise<void> {
        const { changes } = command.payload;

        if (!changes || !Array.isArray(changes)) {
            throw new Error('Missing or invalid changes in command payload');
        }

        for (const change of changes) {
            const filePath = change.file_path;
            const content = change.content;

            const uri = vscode.Uri.file(filePath);

            // Write file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
        }

        vscode.window.showInformationMessage(`Applied ${changes.length} changes`);
    }

    /**
     * Report command completion to backend
     */
    private async completeCommand(
        commandId: string,
        result?: any,
        error?: string
    ): Promise<void> {
        const { apiKey, apiUrl } = this.getConfig();

        const status = error ? 'FAILED' : 'COMPLETED';
        await axios.post(
            `${apiUrl}/api/extensions/jobs/${commandId}/status`,
            { status, message: error || 'Success', metadata: result },
            { headers: { Authorization: `Bearer ${apiKey}` } }
        );
    }
}
