import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { CommandExecutor } from './services/commandExecutor';
import { SyncService } from './services/syncService';
import { SidebarProvider } from './services/SidebarProvider';
import { AuthManager } from './services/authManager';

let statusBarItem: vscode.StatusBarItem;
let pollInterval: NodeJS.Timeout | undefined;
let deviceId: string;
let sidebarProvider: SidebarProvider;
let authManager: AuthManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Shift AI Bridge extension is now active!');

    // Initialize AuthManager
    authManager = new AuthManager(context);

    // Get or create device ID
    deviceId = context.globalState.get('deviceId') || randomUUID();
    context.globalState.update('deviceId', deviceId);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(sync~spin) Shift AI: Connecting...";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Initial check for connection
    authManager.getApiKey().then(apiKey => {
        if (apiKey) {
            statusBarItem.text = "$(cloud) Shift AI";
            statusBarItem.tooltip = "Shift AI: Connected";
            statusBarItem.command = undefined;
            startCommandPolling(apiKey);
            startSyncService(apiKey);
            startPeriodicAnalysis(apiKey);
        } else {
            statusBarItem.text = "$(cloud-offline) Shift AI: Offline";
            statusBarItem.tooltip = "Click to connect with Shift AI";
            statusBarItem.command = 'shift.connect';
        }
    });

    // Register commands
    const connectCommand = vscode.commands.registerCommand('shift.connect', async () => {
        await startConnection();
    });

    const reanalyzeCommand = vscode.commands.registerCommand('shift.reanalyze', async () => {
        const apiKey = await authManager.getApiKey();
        if (!apiKey) {
            vscode.window.showInformationMessage('Shift AI: Starting manual analysis...');
            await runAndReportAnalysis(apiKey);
        });

    const disconnectCommand = vscode.commands.registerCommand('shift.disconnect', async () => {
        const confirm = await vscode.window.showWarningMessage('Are you sure you want to disconnect Shift AI?', 'Yes', 'No');
        if (confirm === 'Yes') {
            const apiKey = await authManager.getApiKey();
            if (apiKey) {
                try {
                    const config = getConfig();
                    await axios.post(`${config.apiUrl}/api/extensions/disconnect`, {}, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                } catch (e) {
                    console.error('Failed to notify backend of disconnect', e);
                }
            }
            await authManager.deleteApiKey();
            vscode.window.showInformationMessage('Shift AI: Disconnected.');
            // Stop services
            if (pollInterval) clearInterval(pollInterval);
            statusBarItem.text = "$(cloud-offline) Shift AI: Offline";
            statusBarItem.command = 'shift.connect';
            statusBarItem.tooltip = "Click to connect with Shift AI";
            // Notify sidebar
            sidebarProvider.notifyConnectionStateChanged(false);
        }
    });

    const importProjectCommand = vscode.commands.registerCommand('shift.importProject', async () => {
        const executor = new CommandExecutor();
        // Since this is manual, we might need to ask for project ID or list them
        // For now, let's just trigger the flow
        vscode.window.showInformationMessage('Loom AI: Import Project feature triggered.');
        // This command is primarily used via jobs, but we register it just in case
    });

    const figmaBridgeCommand = vscode.commands.registerCommand('shift.figmaBridge', async () => {
        const apiKey = await authManager.getApiKey();
        if (!apiKey) {
            vscode.window.showErrorMessage('Shift AI: Please connect to Shift AI first.');
            return;
        }

        const sourceUrl = await vscode.window.showInputBox({
            prompt: 'Enter Source URL (Figma, Lovable, Bolt.new, or any Website)',
            placeHolder: 'https://...'
        });
        if (!sourceUrl) return;

        const isFigma = sourceUrl.includes('figma.com');
        let nodeId: string | undefined;
        if (isFigma) {
            nodeId = await vscode.window.showInputBox({
                prompt: 'Enter Figma Node ID (Optional)',
                placeHolder: 'e.g. 1:123'
            });
        }

        const figmaToken = isFigma ? (await context.globalState.get<string>('figmaToken') || await vscode.window.showInputBox({
            prompt: 'Enter Figma Personal Access Token',
            password: true
        })) : null;

        if (isFigma && !figmaToken) return;
        if (isFigma && figmaToken) await context.globalState.update('figmaToken', figmaToken);

        const config = getConfig();
        const baseUrl = config.apiUrl.replace(/\/$/, '');

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Bridging from ${isFigma ? 'Figma' : 'URL'}...`,
            cancellable: false
        }, async (progress) => {
            try {
                const response = await axios.post(`${baseUrl}/api/bridge/universal`, {
                    sourceUrl,
                    options: {
                        nodeId: nodeId || '0:1',
                        token: figmaToken
                    }
                }, {
                    headers: { Authorization: `Bearer ${apiKey}` }
                });

                if (response.data.success) {
                    const { code, blueprint } = response.data;
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders) {
                        vscode.window.showErrorMessage('No workspace open to save the code.');
                        return;
                    }

                    const componentName = blueprint.root.name.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent';
                    const filePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'components', `${componentName}.tsx`);

                    // Create components dir if not exists
                    const componentsUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'components');
                    await vscode.workspace.fs.createDirectory(componentsUri);

                    await vscode.workspace.fs.writeFile(filePath, Buffer.from(code, 'utf8'));

                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc);

                    vscode.window.showInformationMessage(`✅ Successfully bridged design: ${componentName}.tsx`);
                }
            } catch (error: any) {
                console.error('[FigmaBridge] Error:', error);
                vscode.window.showErrorMessage(`Failed to bridge Figma design: ${error.response?.data?.message || error.message}`);
            }
        });
    });

    context.subscriptions.push(connectCommand, reanalyzeCommand, disconnectCommand, importProjectCommand, figmaBridgeCommand);

    sidebarProvider = new SidebarProvider(context.extensionUri, authManager);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );

    // Register URI Handler
    context.subscriptions.push(vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri) {
            console.log('Received URI:', uri);
            if (uri.path === '/connect') {
                const queryParams = new URLSearchParams(uri.query);
                const pairingId = queryParams.get('pairing_id');
                if (pairingId) {
                    vscode.window.showInformationMessage('Shift AI: Connection request received from browser.');
                    pollForConnection(pairingId);
                }
            }
        }
    }));
}

async function startConnection() {
    const config = getConfig();
    try {
        const sessionId = randomUUID();
        // Ensure proper URL joining
        const baseUrl = config.apiUrl.replace(/\/$/, '');
        const startUrl = `${baseUrl}/api/connect/start`;

        console.log(`[Loom] Starting connection session: ${sessionId}`);

        // 1. Start Session
        const response = await axios.post(startUrl, {
            session_id: sessionId,
            device_id: deviceId,
            machine_info: {
                platform: process.platform,
                arch: process.arch,
                version: vscode.version
            }
        });

        if (response.data.verification_url) {
            // 2. Open Browser
            const verificationUrl = response.data.verification_url;
            vscode.env.openExternal(vscode.Uri.parse(verificationUrl));

            vscode.window.showInformationMessage('Loom: Opening browser to connect...');
            statusBarItem.text = "$(sync~spin) Loom: Connecting...";

            // 3. Start Polling
            await pollForConnection(sessionId);
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to start connection: ${error.message}`);
        statusBarItem.text = "$(cloud-offline) Loom: Not Connected";
    }
}

async function pollForConnection(sessionId: string) {
    const config = getConfig();
    const baseUrl = config.apiUrl.replace(/\/$/, '');
    const syncUrl = `${baseUrl}/api/connect/sync`;

    let attempts = 0;
    const maxAttempts = 60; // 2 minutes (2s interval)

    const poll = async () => {
        if (attempts >= maxAttempts) {
            vscode.window.showErrorMessage('Connection timed out. Please try again.');
            statusBarItem.text = "$(cloud-offline) Loom: Not Connected";
            statusBarItem.command = 'loom.connect';
            return;
        }

        attempts++;
        try {
            const res = await axios.get(syncUrl, {
                params: { session_id: sessionId }
            });

            if (res.data.status === 'authorized' && res.data.token) {
                // Success!
                const apiKey = res.data.token;
                await authManager.setApiKey(apiKey);

                vscode.window.showInformationMessage('✅ Connected to Loom successfully!');

                // Update UI
                statusBarItem.text = "$(cloud) Loom";
                statusBarItem.tooltip = "Loom: Connected";
                statusBarItem.command = undefined;

                // Start services
                sidebarProvider.notifyConnectionStateChanged(true);
                startCommandPolling(apiKey);
                startSyncService(apiKey);
                startPeriodicAnalysis(apiKey);
                return;
            }

            if (res.data.status === 'pending') {
                // Keep polling
                setTimeout(poll, 2000);
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Non-fatal error, keep polling
            setTimeout(poll, 2000);
        }
    };

    poll();
}

// connectWithApiKey removed

async function startCommandPolling(apiKey: string) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        await pollAndExecuteJobs(apiKey);
    }, 5000); // Poll every 5 seconds for V1 responsiveness

    pollAndExecuteJobs(apiKey);
}

async function pollAndExecuteJobs(apiKey: string): Promise<void> {
    const config = getConfig();
    if (!apiKey) return;

    try {
        // Ensure proper URL joining
        const baseUrl = config.apiUrl.replace(/\/$/, '');
        const jobsUrl = `${baseUrl}/api/extensions/jobs`;

        const response = await axios.get(jobsUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'x-device-id': deviceId
            }
        });

        const jobs = response.data.jobs || [];

        if (jobs.length > 0) {
            const executor = new CommandExecutor();
            for (const job of jobs) {
                try {
                    // Update Status: IN_PROGRESS
                    sidebarProvider.sendState({
                        activeJob: { name: job.type, status: 'Executing...' },
                        logs: [`Job started: ${job.type}`]
                    });

                    await axios.post(`${config.apiUrl}/api/extensions/jobs/${job.job_id}/status`,
                        { status: 'IN_PROGRESS', message: 'Executing...' },
                        { headers: { Authorization: `Bearer ${apiKey}` } }
                    );

                    await executor.execute({
                        id: job.job_id,
                        command_type: job.type,
                        payload: job.payload,
                        created_at: new Date().toISOString(),
                        status: 'executing'
                    });

                    // Update Status: COMPLETED
                    sidebarProvider.sendState({
                        activeJob: null,
                        logs: [`Job success: ${job.type}`]
                    });

                    await axios.post(`${config.apiUrl}/api/extensions/jobs/${job.job_id}/status`,
                        { status: 'COMPLETED', message: 'Success' },
                        { headers: { Authorization: `Bearer ${apiKey}` } }
                    );
                } catch (err: any) {
                    // Update Status: FAILED
                    sidebarProvider.sendState({
                        activeJob: { name: job.type, status: 'FAILED' },
                        logs: [`Job failed: ${err.message}`]
                    });
                    await axios.post(`${config.apiUrl}/api/extensions/jobs/${job.job_id}/status`,
                        { status: 'FAILED', message: err.message },
                        { headers: { Authorization: `Bearer ${apiKey}` } }
                    );
                }
            }
        }
    } catch (error: any) {
        console.error('Job polling error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('Loom: Session invalidated, logging out...');
            await authManager.deleteApiKey();
            if (pollInterval) clearInterval(pollInterval);
            statusBarItem.text = "$(cloud-offline) Shift AI: Offline";
            statusBarItem.command = 'shift.connect';
            sidebarProvider.notifyConnectionStateChanged(false);
            vscode.window.showWarningMessage('Shift AI: Session expired or disconnected from web.');
        }
    }
}

async function startPeriodicAnalysis(apiKey: string) {
    // Initial analysis
    await runAndReportAnalysis(apiKey);

    // Every 5 minutes
    setInterval(async () => {
        await runAndReportAnalysis(apiKey);
    }, 5 * 60 * 1000);
}

async function runAndReportAnalysis(apiKey: string) {
    const config = getConfig();
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const projectName = workspaceFolders[0].name;

    try {
        // 1. Detect Framework
        let framework = 'custom';
        const packageJsonFiles = await vscode.workspace.findFiles('package.json', '**/node_modules/**', 1);
        if (packageJsonFiles.length > 0) {
            try {
                const pkg = await vscode.workspace.fs.readFile(packageJsonFiles[0]);
                const pkgJson = JSON.parse(Buffer.from(pkg).toString('utf8'));
                const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };

                if (deps.next) framework = 'nextjs';
                else if (deps.react) framework = 'react';
                else if (deps.vue) framework = 'vue';
                else if (deps.svelte) framework = 'svelte';
                else framework = 'nodejs';
            } catch (e) {
                console.error('[Loom] Failed to parse package.json', e);
            }
        }

        // 2. Count Files
        const allFiles = await vscode.workspace.findFiles('**/*', '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**}');
        const fileCount = allFiles.length;

        // 3. Components Count (Approximate)
        const components = await vscode.workspace.findFiles('**/{components,src/components}/**/*.{tsx,jsx,vue,svelte}', '**/node_modules/**');

        const baseUrl = config.apiUrl.replace(/\/$/, '');
        const analysisUrl = `${baseUrl}/api/extensions/analysis`;

        await axios.post(analysisUrl, {
            project_id: deviceId,
            name: projectName,
            summary: {
                framework: framework,
                components: components.length,
                dependencies: fileCount,
            },
            issues: []
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'x-device-id': deviceId
            }
        });

        console.log(`[Loom] Real analysis reported: ${projectName} (${framework}, ${fileCount} files)`);
    } catch (error: any) {
        console.error('[Loom] Failed to report analysis:', error.message);
    }
}

function getConfig() {
    const config = vscode.workspace.getConfiguration('shift');
    return {
        apiUrl: config.get<string>('apiUrl') || 'http://localhost:4000'
    };
}

let syncService: SyncService | undefined;

async function startSyncService(apiKey: string) {
    const config = getConfig();
    if (apiKey) {
        if (syncService) {
            syncService.dispose();
        }
        // deviceId global var from activation
        syncService = new SyncService(apiKey, deviceId, config.apiUrl);
    }
}

export function deactivate() {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    if (syncService) {
        syncService.dispose();
    }
}
