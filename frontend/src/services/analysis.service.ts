import { authService } from "./auth.service";
import { fetchAPI } from "@/utils/api";

export interface AnalysisInput {
    source: string;
    projectId?: string;
    repo?: string;
    url?: string; // For Figma
    prompt?: string; // For Prompt
    toolType?: string; // For specialized refactoring (lovable, bubble, etc.)
}

export interface AnalysisResult {
    issues?: Array<{
        type: 'error' | 'warning' | 'info';
        message: string;
        detail: string;
        file?: string;
        line?: number;
    }>;
    score?: number;
    summary?: string;
    creditsUsed?: number;
    creditsRemaining?: number;
    blueprint?: any;
    analysisId?: string;
    analysis?: {
        issues?: any[];
        score?: number;
        summary?: string;
        code?: string;
    };
    code?: string;
}

export const analysisService = {
    async analyze(input: AnalysisInput): Promise<AnalysisResult> {
        const session = await authService.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("No active session");
        }

        return fetchAPI<AnalysisResult>('/analyze', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                projectId: input.projectId || 'pending',
                source: input.source,
                toolType: input.toolType,
                payload: {
                    repo: input.repo,
                    url: input.url,
                    prompt: input.prompt
                }
            })
        });
    },

    async *analyzeStream(input: AnalysisInput): AsyncGenerator<any> {
        const session = await authService.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error("No active session");
        }

        const apiUrl = '';
        const response = await fetch(`${apiUrl}/api/analyze/stream`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: input.projectId || 'pending',
                source: input.source,
                toolType: input.toolType,
                payload: {
                    repo: input.repo,
                    url: input.url,
                    prompt: input.prompt
                }
            })
        });

        if (!response.body) throw new Error("No response body");
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        yield JSON.parse(line);
                    } catch (e) {
                        console.error("Failed to parse stream line:", line);
                    }
                }
            }
        }
    },

    async getAnalyses(projectId?: string): Promise<any[]> {
        const session = await authService.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No active session");

        const url = projectId ? `/analyses?projectId=${projectId}` : '/analyses';
        return fetchAPI<any[]>(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },

    async fix(projectId: string, issueDescription: string, fileContent: string, fileName?: string): Promise<{ fixedCode: string; explanation: string }> {
        const session = await authService.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No active session");

        return fetchAPI<{ fixedCode: string; explanation: string }>('/analyze/fix', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ projectId, issueDescription, fileContent, fileName })
        });
    },

    async architect(prompt: string): Promise<any> {
        const session = await authService.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No active session");

        return fetchAPI<any>('/architect', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ prompt })
        });
    },

    async getDeltas(projectId: string): Promise<any[]> {
        const session = await authService.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No active session");

        return fetchAPI<any[]>(`/deltas?projectId=${projectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    },

    async scanDeltas(projectId: string): Promise<{ jobId: string }> {
        const session = await authService.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("No active session");

        return fetchAPI<{ jobId: string }>('/deltas/scan', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ projectId, direction: 'builder' })
        });
    }
};


