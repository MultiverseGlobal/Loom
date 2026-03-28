import * as vscode from 'vscode';

export class AuthManager {
    private static readonly API_KEY_SECRET_KEY = 'loom_api_key';

    constructor(private context: vscode.ExtensionContext) { }

    public async setApiKey(apiKey: string): Promise<void> {
        await this.context.secrets.store(AuthManager.API_KEY_SECRET_KEY, apiKey);
    }

    public async getApiKey(): Promise<string | undefined> {
        return await this.context.secrets.get(AuthManager.API_KEY_SECRET_KEY);
    }

    public async deleteApiKey(): Promise<void> {
        await this.context.secrets.delete(AuthManager.API_KEY_SECRET_KEY);
    }

    public async isConnected(): Promise<boolean> {
        const apiKey = await this.getApiKey();
        return !!apiKey;
    }
}
