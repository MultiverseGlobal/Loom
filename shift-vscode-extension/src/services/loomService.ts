import axios from 'axios';
import * as vscode from 'vscode';

export interface LoomProject {
    id: string;
    name: string;
    platform: string;
    repoUrl?: string;
    createdAt: string;
}

export class LoomService {
    private getConfig() {
        const config = vscode.workspace.getConfiguration('loom');
        return {
            apiKey: config.get<string>('apiKey') || '',
            apiUrl: config.get<string>('apiUrl') || 'http://localhost:3000'
        };
    }

    async getPendingProjects(): Promise<LoomProject[]> {
        const { apiKey, apiUrl } = this.getConfig();

        if (!apiKey) {
            throw new Error('Loom API key not configured. Run "Loom: Configure API Key" command.');
        }

        try {
            const response = await axios.get(`${apiUrl}/api/projects/pending`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            return response.data.projects || [];
        } catch (error) {
            console.error('Failed to fetch pending projects:', error);
            return [];
        }
    }
}
