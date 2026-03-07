import * as vscode from 'vscode';
import { AuthManager } from './authManager';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'loom.sidebar';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _authManager: AuthManager
    ) { }

    public sendState(state: any) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateState', state });
        }
    }

    public notifyConnectionStateChanged(connected: boolean) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'connectionStateChanged', connected });
        }
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        // Create the HTML asynchronously and then set it
        const html = await this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.html = html;

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'connect':
                    vscode.commands.executeCommand('loom.connect');
                    break;
                case 'disconnect':
                    vscode.commands.executeCommand('loom.disconnect');
                    break;
                case 'bridge':
                    vscode.commands.executeCommand('loom.figmaBridge');
                    break;
                case 'onInfo':
                    if (data.value) vscode.window.showInformationMessage(data.value);
                    break;
                case 'onError':
                    if (data.value) vscode.window.showErrorMessage(data.value);
                    break;
            }
        });
    }

    private async _getHtmlForWebview(webview: vscode.Webview) {
        let isConnected = false;
        try {
            isConnected = await this._authManager.isConnected();
        } catch (e) {
            console.error('[Loom] Failed to check connection state:', e);
        }

        const extensionVersion = vscode.extensions.getExtension('LoomAI.loom-dev-bridge')?.packageJSON.version || '0.1.0';

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src https: data:;">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    :root {
                        --emerald: #10b981;
                        --bg-root: var(--vscode-sideBar-background);
                        --bg-card: var(--vscode-editor-background);
                        --border-default: var(--vscode-sideBar-border);
                        --text-primary: var(--vscode-sideBar-foreground);
                        --text-secondary: var(--vscode-descriptionForeground);
                        --text-tertiary: var(--vscode-disabledForeground);
                    }
                    
                    body {
                        font-family: var(--vscode-font-family), 'Inter', sans-serif;
                        background: var(--bg-root);
                        color: var(--text-primary);
                        font-size: var(--vscode-font-size);
                        padding: 0;
                        overflow-x: hidden;
                    }
                    
                    .identity { padding: 20px 16px; border-bottom: 1px solid var(--border-default); }
                    .identity-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 6px; }
                    .identity-status { display: flex; align-items: center; gap: 8px; font-size: 12px; }
                    .status-indicator { width: 6px; height: 6px; border-radius: 50%; background: var(--emerald); }
                    .status-indicator.disconnected { background: var(--text-tertiary); }
                    
                    .card { margin: 16px 12px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: 12px; padding: 20px; text-align: center; }
                    .title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
                    .subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
                    
                    .btn { background: var(--emerald); color: #0a0a0a; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; transition: opacity 0.2s; }
                    .btn:hover { opacity: 0.9; }
                    .btn-secondary { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); }
                    .link { display: inline-block; color: var(--emerald); text-decoration: none; margin-top: 16px; font-size: 12px; }
                    
                    .hidden { display: none; }
                </style>
            </head>
            <body>
                <div class="identity">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <svg width="20" height="20" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M32 16 L32 96 L96 96" stroke="#10b981" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M48 40 L48 80 L80 80" stroke="#10b981" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
                            <circle cx="96" cy="96" r="8" fill="#10b981" />
                            <circle cx="80" cy="80" r="6" fill="#10b981" opacity="0.6" />
                        </svg>
                        <div class="identity-title" style="margin-bottom: 0;">LOOM <span style="color: var(--emerald); font-size: 8px; opacity: 0.5;">V${extensionVersion}</span></div>
                    </div>
                    <div class="identity-status">
                        <span class="status-indicator ${isConnected ? '' : 'disconnected'}" id="status-indicator"></span>
                        <span id="status-text">${isConnected ? 'Observing' : 'Not Connected'}</span>
                    </div>
                </div>

                <div id="nc-view" class="${isConnected ? 'hidden' : ''}">
                    <div class="card">
                        <div class="title">Connect to Loom</div>
                        <p class="subtitle">Bridge your local project with Loom AI to enable automated analysis.</p>
                        <button class="btn" onclick="send('connect')">Connect to Loom</button>
                        <p class="link" style="opacity: 0.5;">No API Key required</p>
                    </div>
                </div>

                <div id="c-view" class="${isConnected ? '' : 'hidden'}">
                    <div class="card" style="border-color: rgba(16,185,129,0.2);">
                        <div class="title">Loom is Active</div>
                        <p class="subtitle" id="agent-msg">Ready to analyze your project.</p>
                    </div>

                    <div class="card" style="margin-top: 0;">
                        <div class="title" style="font-size: 14px;">Universal Bridge</div>
                        <p class="subtitle" style="font-size: 12px; margin-bottom: 12px;">Import from Figma, Lovable, Bolt.new, or any Website.</p>
                        <button class="btn" onclick="send('bridge')">Bridge No-Code Project</button>
                    </div>

                    <div style="padding: 0 12px;">
                        <button class="btn btn-secondary" onclick="send('disconnect')" style="padding: 8px;">Disconnect</button>
                    </div>
                </div>

                <script>
                    (function() {
                        try {
                            const vscode = acquireVsCodeApi();
                            console.log('[Loom] Sidebar Initialized');

                            window.send = function(type) {
                                vscode.postMessage({ type });
                            };

                            window.addEventListener('message', event => {
                                try {
                                    const m = event.data;
                                    if (m.type === 'connectionStateChanged') {
                                        const connected = !!m.connected;
                                        document.getElementById('nc-view').classList.toggle('hidden', connected);
                                        document.getElementById('c-view').classList.toggle('hidden', !connected);
                                        document.getElementById('status-indicator').className = 'status-indicator' + (connected ? '' : ' disconnected');
                                        document.getElementById('status-text').innerText = connected ? 'Observing' : 'Not Connected';
                                    }
                                    if (m.type === 'updateState' && m.state) {
                                        if (m.state.agentMessage) document.getElementById('agent-msg').innerText = m.state.agentMessage;
                                        if (m.state.status) document.getElementById('status-text').innerText = m.state.status;
                                    }
                                } catch (e) {
                                    console.error('[Loom] Error handling message:', e);
                                }
                            });
                        } catch (e) {
                            console.error('[Loom] Fatal error in sidebar script:', e);
                        }
                    })();
                </script>
            </body>
            </html>`;
    }
}
