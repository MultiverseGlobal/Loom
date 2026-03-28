import { createClient } from "@/lib/supabase";
import { fetchAPI } from "@/utils/api";

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    private: boolean;
    description: string | null;
    updated_at: string;
}

export const githubService = {
    /**
     * Fetch repositories through our backend (which uses stored tokens)
     */
    async getRepositories(): Promise<GitHubRepo[]> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const data = await fetchAPI<{ repos: GitHubRepo[] }>('/github/repos', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        return data.repos;
    },

    /**
     * Initiate GitHub OAuth flow by getting the authorize URL from backend
     */
    async getAuthorizeUrl(): Promise<string> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const data = await fetchAPI<{ url: string }>('/github/authorize', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!data.url) throw new Error("Backend did not return an authorization URL");
        return data.url;
    },

    async getStatus(): Promise<{ connected: boolean; username?: string }> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) return { connected: false };

        return await fetchAPI('/github/status', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
    }
};
