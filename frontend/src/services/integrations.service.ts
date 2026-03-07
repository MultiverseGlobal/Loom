import { createClient } from "@/lib/supabase";
import { fetchAPI } from "@/utils/api";

export interface Integration {
    id: string;
    provider: 'github' | 'figma' | 'linear' | 'notion' | 'slack';
    provider_account_id: string;
    scope?: string;
    metadata: Record<string, any>;
    connected_at: string;
    last_synced_at?: string;
    has_token: boolean;
}

export interface IntegrationResource {
    type: string;
    id: string;
    name: string;
    full_name?: string;
    description?: string;
    private?: boolean;
    url?: string;
    updated_at?: string;
}

export interface ProjectIntegration {
    id: string;
    project_id: string;
    integration_id: string;
    resource_type: string;
    resource_id: string;
    resource_name: string;
    sync_enabled: boolean;
    sync_config: Record<string, any>;
    last_sync_at?: string;
    created_at: string;
    integration?: {
        id: string;
        provider: string;
        provider_account_id: string;
        scope?: string;
        metadata: Record<string, any>;
        connected_at: string;
    };
}

export const integrationsService = {
    /**
     * Get all user integrations
     */
    async getIntegrations(): Promise<Integration[]> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const data = await fetchAPI<{ integrations: Integration[] }>('/integrations', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        return data.integrations;
    },

    /**
     * Get integration status for a provider
     */
    async getProviderStatus(provider: string): Promise<{ connected: boolean; integration: Integration | null }> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        return fetchAPI<{ connected: boolean; integration: Integration | null }>(
            `/integrations/${provider}/status`,
            {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            }
        );
    },

    /**
     * Get resources for an integration (repos, workspaces, etc.)
     */
    async getIntegrationResources(integrationId: string, page: number = 1): Promise<IntegrationResource[]> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const data = await fetchAPI<{ resources: IntegrationResource[] }>(
            `/integrations/${integrationId}/resources?page=${page}`,
            {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            }
        );

        return data.resources;
    },

    /**
     * Disconnect an integration
     */
    async disconnectIntegration(integrationId: string): Promise<void> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        await fetchAPI<void>(
            `/integrations/${integrationId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            }
        );
    },

    /**
     * Link an integration resource to a project
     */
    async linkToProject(projectId: string, data: {
        integration_id: string;
        resource_type: string;
        resource_id: string;
        resource_name: string;
        sync_enabled?: boolean;
        sync_config?: Record<string, any>;
    }): Promise<ProjectIntegration> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const result = await fetchAPI<{ link: ProjectIntegration }>(
            `/projects/${projectId}/integrations`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(data)
            }
        );

        return result.link;
    },

    /**
     * Get project's integrations
     */
    async getProjectIntegrations(projectId: string): Promise<ProjectIntegration[]> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const data = await fetchAPI<{ integrations: ProjectIntegration[] }>(
            `/projects/${projectId}/integrations`,
            {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            }
        );

        return data.integrations;
    },

    /**
     * Unlink integration from project
     */
    async unlinkFromProject(projectId: string, linkId: string): Promise<void> {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Not authenticated");

        await fetchAPI<void>(
            `/projects/${projectId}/integrations/${linkId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            }
        );
    }
};
