import simpleGit, { SimpleGit } from 'simple-git';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export class GitService {
    private git: SimpleGit;

    constructor() {
        this.git = simpleGit();
    }

    async cloneProject(repoUrl: string, projectName: string, branch: string = 'main'): Promise<string> {
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

        // Clone repository with branch
        await this.git.clone(repoUrl, projectPath, ['--branch', branch, '--single-branch']);

        return projectPath;
    }

    async installDependencies(projectPath: string): Promise<void> {
        const terminal = vscode.window.createTerminal({
            name: 'Loom Setup',
            cwd: projectPath
        });

        terminal.show();

        // Detect package manager
        const hasYarnLock = fs.existsSync(path.join(projectPath, 'yarn.lock'));
        const hasPnpmLock = fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'));

        if (hasPnpmLock) {
            terminal.sendText('pnpm install');
        } else if (hasYarnLock) {
            terminal.sendText('yarn install');
        } else {
            terminal.sendText('npm install');
        }
    }
}
