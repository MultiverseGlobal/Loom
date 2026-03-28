import * as vscode from 'vscode';
import WebSocket from 'ws';
import * as path from 'path';
import * as fs from 'fs';

export class SyncService {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private fileWatcher: vscode.FileSystemWatcher | null = null;

    constructor(
        private apiKey: string,
        private deviceId: string,
        private apiUrl: string
    ) {
        this.connect();
        this.startFileWatcher();
    }

    private connect() {
        // apiUrl is http(s), convert to ws(s)
        const wsUrl = this.apiUrl.replace(/^http/, 'ws') + '/ws';

        console.log(`Connecting to WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.on('open', () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.authenticate();
        });

        this.ws.on('message', (data: any) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(message);
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        });

        this.ws.on('close', () => {
            console.log('WebSocket closed');
            this.isConnected = false;
            this.scheduleReconnect();
        });

        this.ws.on('error', (err: any) => {
            console.error('WebSocket error', err);
        });
    }

    private authenticate() {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: 'AUTH',
                payload: {
                    apiKey: this.apiKey,
                    deviceId: this.deviceId
                }
            }));
        }
    }

    private scheduleReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                if (!this.isConnected) {
                    console.log('Attempting to reconnect...');
                    this.connect();
                } else {
                    if (this.reconnectInterval) {
                        clearInterval(this.reconnectInterval);
                        this.reconnectInterval = null;
                    }
                }
            }, 5000);
        }
    }

    private handleMessage(message: any) {
        console.log('Received WS message:', message);
        // Handle incoming commands or sync events here
        if (message.type === 'AUTH_SUCCESS') {
            console.log('Sync Service Authenticated');
        }
    }

    private startFileWatcher() {
        // Watch all files in workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        // Watch for changes (ignore node_modules, etc)
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, 'src/**/*.{ts,tsx,js,jsx,css}')
        );

        this.fileWatcher.onDidChange((uri) => this.onFileChange(uri));
        this.fileWatcher.onDidCreate((uri) => this.onFileChange(uri));
        this.fileWatcher.onDidDelete((uri) => this.onFileDelete(uri));
    }

    private onFileChange(uri: vscode.Uri) {
        if (!this.isConnected || !this.ws) return;

        // Debounce logic could be added here
        try {
            const content = fs.readFileSync(uri.fsPath, 'utf-8');
            const relativePath = vscode.workspace.asRelativePath(uri);

            console.log(`Sending file change for ${relativePath}`);

            this.ws.send(JSON.stringify({
                type: 'FILE_CHANGE',
                payload: {
                    path: relativePath,
                    content: content,
                    timestamp: Date.now()
                }
            }));
        } catch (e) {
            console.error(`Failed to read file ${uri.fsPath}`, e);
        }
    }

    private onFileDelete(uri: vscode.Uri) {
        if (!this.isConnected || !this.ws) return;

        const relativePath = vscode.workspace.asRelativePath(uri);
        this.ws.send(JSON.stringify({
            type: 'FILE_CHANGE',
            payload: {
                path: relativePath,
                deleted: true,
                timestamp: Date.now()
            }
        }));
    }

    public dispose() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
        }
    }
}
