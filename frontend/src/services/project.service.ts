import { createClient } from '@/lib/supabase';
import { fetchAPI } from '@/utils/api';

export interface Project {
    id: string;
    created_at: string;
    name: string;
    description?: string;
    platform: 'loveable' | 'figma' | 'komposo' | 'webflow';
    source_url?: string;
    status: 'processing' | 'ready' | 'failed';
    user_id: string;
    framework?: string;
    access_mode: 'full' | 'analysis'; // Added for fallback mode
}

export interface CreateProjectInput {
    name: string;
    description?: string;
    platform?: 'loveable' | 'figma' | 'komposo' | 'webflow'; // Made optional as we default to 'komposo' or specific logic
    framework?: string; // Added framework
    source_url?: string;
}

export const projectService = {
    async createProject(input: CreateProjectInput): Promise<Project> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        return fetchAPI<Project>('/projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                name: input.name,
                framework: input.framework,
                source_platform: input.platform || 'komposo',
                source_url: input.source_url
            })
        });
    },

    async getProjects(): Promise<Project[]> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        try {
            return await fetchAPI<Project[]>('/projects', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
        } catch (error) {
            console.error("Failed to fetch projects:", error);
            return [];
        }
    },

    async getProject(id: string): Promise<Project | null> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        try {
            return await fetchAPI<Project>(`/projects/${id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
        } catch (error) {
            console.error(`Failed to fetch project ${id}:`, error);
            return null;
        }
    },

    async deleteProject(id: string): Promise<void> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        await fetchAPI<void>(`/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
    },

    async updateProject(id: string, updates: Partial<CreateProjectInput>): Promise<Project> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        return fetchAPI<Project>(`/projects/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(updates)
        });
    },

    async generateUI(prompt: string, framework: string = "React"): Promise<{ code: string; explanation: string }> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) throw new Error("User not authenticated");

        return fetchAPI<{ code: string; explanation: string }>('/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ prompt, framework })
        });
    },

    async ingestCode(payload: { projectId?: string, projectName?: string, sourceType: string, content?: string }): Promise<void> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        await fetchAPI<void>('/ingest', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(payload)
        });
    },

    async pushToIDE(projectId: string): Promise<{ success: boolean; command_id: string }> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        return fetchAPI<{ success: boolean; command_id: string }>(`/projects/${projectId}/push-to-ide`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
    },

    async getProjectFiles(projectId: string): Promise<Array<{ id: string; file_path: string; type: string; updated_at: string; content?: string }>> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        return fetchAPI<any[]>(`/projects/${projectId}/files`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
    },

    async downloadProjectZip(projectId: string, projectName: string): Promise<void> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/projects/${projectId}/export`, {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) throw new Error("Failed to download project ZIP");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    async pushToGithub(projectId: string, payload: { repoName: string; isPrivate: boolean; createRepo: boolean }): Promise<{ success: boolean; repoUrl: string }> {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("User not authenticated");

        return fetchAPI<{ success: boolean; repoUrl: string }>(`/projects/${projectId}/push-to-github`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(payload)
        });
    }
};
