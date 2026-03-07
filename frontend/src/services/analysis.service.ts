import { authService } from "./auth.service";
import { fetchAPI } from "@/utils/api";

export interface AnalysisInput {
    source: string;
    projectId?: string;
    repo?: string;
    url?: string; // For Figma
    prompt?: string; // For Prompt
}

export interface AnalysisResult {
    issues: Array<{
        type: 'error' | 'warning' | 'info';
        message: string;
        detail: string;
        file?: string;
        line?: number;
    }>;
    score: number;
    summary: string;
    creditsUsed: number;
    creditsRemaining: number;
    blueprint?: any;
    analysisId?: string;
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
                payload: {
                    repo: input.repo,
                    url: input.url,
                    prompt: input.prompt
                }
            })
        });
    },

    async getAnalyses(projectId?: string): Promise<any[]> {
        const session = await authService.getSession();
        const token = session?.access_token;

        if (!token) throw new Error("No active session");

        const url = projectId ? `/analyses?projectId=${projectId}` : '/analyses';
        return fetchAPI<any[]>(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
};
