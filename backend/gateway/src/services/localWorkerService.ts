import * as commandService from './commandService.js';
import { localFileSystemService } from './localFileSystemService.js';
import path from 'path';

/**
 * Local Worker Service
 * Polls for commands targeted at the Local Engine and executes them.
 */
export class LocalWorkerService {
    private static interval: NodeJS.Timeout | null = null;
    private static readonly DEVICE_ID = 'LOCAL-ENGINE-001';
    private static readonly BASE_DIR = path.join(process.cwd(), '..', '..', 'ShiftLocalWorkspace');

    static async start() {
        if (this.interval) return;

        console.log(`[LocalWorker] Starting Local Engine Worker for device ${this.DEVICE_ID}`);
        console.log(`[LocalWorker] Base workspace: ${this.BASE_DIR}`);

        // Initial check and ensuring registration
        const userId = '3f3e183a-b144-4882-9014-ea5aa1a2d585'; // bytemge@gmail.com
        await commandService.ensureLocalDevice(userId);

        this.interval = setInterval(() => this.poll(), 5000);
    }

    static async stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private static async poll() {
        try {
            const commands = await commandService.pollCommands(this.DEVICE_ID);
            for (const command of commands) {
                await this.execute(command);
            }
        } catch (error) {
            console.error('[LocalWorker] Poll error:', error);
        }
    }

    private static async execute(command: any) {
        console.log(`[LocalWorker] Executing ${command.command_type} for project ${command.project_id}`);
        await commandService.startCommand(command.id);

        try {
            switch (command.command_type) {
                case 'IMPORT_PROJECT':
                    await this.handleImportProject(command);
                    break;
                case 'APPLY_CHANGES':
                    await this.handleApplyChanges(command);
                    break;
                default:
                    console.warn(`[LocalWorker] Unknown command type: ${command.command_type}`);
            }

            await commandService.completeCommand(command.id, {
                success: true,
                message: 'Executed locally by Shift Engine',
                local_path: path.join(this.BASE_DIR, command.payload.projectName || 'unnamed-project')
            });
            console.log(`[LocalWorker] Completed command ${command.id}`);

        } catch (error: any) {
            console.error(`[LocalWorker] Execution failed:`, error);
            await commandService.failCommand(command.id, error.message || 'Local execution failed');
        }
    }

    private static async handleImportProject(command: any) {
        const projectName = command.payload.projectName || 'unnamed-project';
        const projectPath = path.join(this.BASE_DIR, projectName);

        console.log(`[LocalWorker] Importing project to ${projectPath}`);

        // Ensure workspace directory exists
        await localFileSystemService.writeFile(path.join(projectPath, '.shift-info.json'), JSON.stringify({
            projectId: command.project_id,
            name: projectName,
            importedAt: new Date().toISOString()
        }, null, 2));

        // Create a README if it doesn't exist
        const readmePath = path.join(projectPath, 'README.md');
        if (!(await localFileSystemService.exists(readmePath))) {
            await localFileSystemService.writeFile(readmePath, `# ${projectName}\n\nManaged by Shift AI Local Engine.`);
        }
    }

    private static async handleApplyChanges(command: any) {
        // Implementation for applying patches directly to files
        console.log(`[LocalWorker] Patching files for project ${command.project_id}`);
        // In a real scenario, we loop through patches in payload and apply them
    }
}
