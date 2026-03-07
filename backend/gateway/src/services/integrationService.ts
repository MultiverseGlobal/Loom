import { db } from "../db/client.js";

export interface Integration {
    id: string;
    user_id: string;
    provider: 'github' | 'figma' | 'linear' | 'notion' | 'slack';
    provider_account_id: string;
    access_token: string;
    refresh_token?: string;
    token_expires_at?: Date;
    scope?: string;
    metadata: Record<string, any>;
    connected_at: Date;
    last_synced_at?: Date;
    created_at: Date;
    updated_at: Date;
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
    last_sync_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export const integrationService = {
    /**
     * Get all integrations for a user
     */
    async getUserIntegrations(userId: string): Promise<Integration[]> {
        const rows = await db<Integration[]>`
            SELECT * FROM integrations 
            WHERE user_id = ${userId}
            ORDER BY connected_at DESC
        `;
        return rows;
    },

    /**
     * Get a specific integration by ID
     */
    async getIntegration(id: string, userId: string): Promise<Integration | null> {
        const rows = await db<Integration[]>`
            SELECT * FROM integrations 
            WHERE id = ${id} AND user_id = ${userId}
            LIMIT 1
        `;
        return rows[0] ?? null;
    },

    /**
     * Get integration by provider and account ID
     */
    async getIntegrationByProvider(
        userId: string,
        provider: string,
        providerAccountId: string
    ): Promise<Integration | null> {
        const rows = await db<Integration[]>`
            SELECT * FROM integrations 
WHERE user_id = ${userId} 
            AND provider = ${provider}
            AND provider_account_id = ${providerAccountId}
            LIMIT 1
        `;
        return rows[0] ?? null;
    },

    /**
     * Get user's integration for a specific provider (returns first match)
     */
    async getUserIntegrationByProvider(
        userId: string,
        provider: string
    ): Promise<Integration | null> {
        const rows = await db<Integration[]>`
            SELECT * FROM integrations 
            WHERE user_id = ${userId} AND provider = ${provider}
            ORDER BY connected_at DESC
            LIMIT 1
        `;
        return rows[0] ?? null;
    },

    /**
     * Save or update an integration
     */
    async saveIntegration(data: {
        user_id: string;
        provider: string;
        provider_account_id: string;
        access_token: string;
        refresh_token?: string;
        token_expires_at?: Date;
        scope?: string;
        metadata?: Record<string, any>;
    }): Promise<Integration> {
        const rows = await db<Integration[]>`
            INSERT INTO integrations (
                user_id, provider, provider_account_id, 
                access_token, refresh_token, token_expires_at, scope, metadata
            )
            VALUES (
                ${data.user_id}, ${data.provider}, ${data.provider_account_id},
                ${data.access_token}, ${data.refresh_token ?? null}, 
                ${data.token_expires_at ?? null}, ${data.scope ?? null},
                ${JSON.stringify(data.metadata ?? {})}
            )
            ON CONFLICT (user_id, provider, provider_account_id)
            DO UPDATE SET
                access_token = EXCLUDED.access_token,
                refresh_token = COALESCE(EXCLUDED.refresh_token, integrations.refresh_token),
                token_expires_at = COALESCE(EXCLUDED.token_expires_at, integrations.token_expires_at),
                scope = COALESCE(EXCLUDED.scope, integrations.scope),
                metadata = COALESCE(EXCLUDED.metadata, integrations.metadata),
                updated_at = NOW()
            RETURNING *
        `;
        return rows[0];
    },

    /**
     * Delete an integration
     */
    async deleteIntegration(id: string, userId: string): Promise<boolean> {
        const result = await db`
            DELETE FROM integrations 
            WHERE id = ${id} AND user_id = ${userId}
        `;
        return result.count > 0;
    },

    /**
     * Link a project to an integration resource
     */
    async linkProjectToIntegration(data: {
        project_id: string;
        integration_id: string;
        resource_type: string;
        resource_id: string;
        resource_name: string;
        sync_enabled?: boolean;
        sync_config?: Record<string, any>;
    }): Promise<ProjectIntegration> {
        const rows = await db<ProjectIntegration[]>`
            INSERT INTO project_integrations (
                project_id, integration_id, resource_type, 
                resource_id, resource_name, sync_enabled, sync_config
            )
            VALUES (
                ${data.project_id}, ${data.integration_id}, ${data.resource_type},
                ${data.resource_id}, ${data.resource_name}, 
                ${data.sync_enabled ?? true}, ${JSON.stringify(data.sync_config ?? {})}
            )
            ON CONFLICT (project_id, integration_id, resource_id)
            DO UPDATE SET
                resource_name = EXCLUDED.resource_name,
                sync_enabled = EXCLUDED.sync_enabled,
                sync_config = EXCLUDED.sync_config,
                updated_at = NOW()
            RETURNING *
        `;
        return rows[0];
    },

    /**
     * Get all integrations linked to a project
     */
    async getProjectIntegrations(projectId: string): Promise<(ProjectIntegration & { integration: Integration })[]> {
        const rows = await db<(ProjectIntegration & { integration: Integration })[]>`
            SELECT 
                pi.*,
                jsonb_build_object(
                    'id', i.id,
                    'provider', i.provider,
                    'provider_account_id', i.provider_account_id,
                    'scope', i.scope,
                    'metadata', i.metadata,
                    'connected_at', i.connected_at
                ) as integration
            FROM project_integrations pi
            JOIN integrations i ON i.id = pi.integration_id
            WHERE pi.project_id = ${projectId}
            ORDER BY pi.created_at DESC
        `;
        return rows;
    },

    /**
     * Unlink a project integration
     */
    async unlinkProjectIntegration(id: string): Promise<boolean> {
        const result = await db`
            DELETE FROM project_integrations 
            WHERE id = ${id}
        `;
        return result.count > 0;
    },

    /**
     * Get a specific project integration
     */
    async getProjectIntegration(id: string): Promise<ProjectIntegration | null> {
        const rows = await db<ProjectIntegration[]>`
            SELECT * FROM project_integrations 
            WHERE id = ${id}
            LIMIT 1
        `;
        return rows[0] ?? null;
    },

    /**
     * Update last sync time
     */
    async updateLastSync(integrationId: string): Promise<void> {
        await db`
            UPDATE integrations 
            SET last_synced_at = NOW()
            WHERE id = ${integrationId}
        `;
    },

    /**
     * Update project integration last sync time
     */
    async updateProjectIntegrationLastSync(id: string): Promise<void> {
        await db`
            UPDATE project_integrations 
            SET last_sync_at = NOW()
            WHERE id = ${id}
        `;
    }
};
