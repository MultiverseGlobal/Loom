import { db } from "../db/client.js";

export type FileOriginRecord = {
    id: string;
    project_id: string;
    file_path: string;
    origin_source: 'ai_generated' | 'human_authored' | 'mixed' | 'scaffold';
    origin_tool: string | null;
    initial_hash: string | null;
    current_status: 'synced' | 'drifted' | 'conflict' | 'detached';
    risk_score: number;
    detected_smells: any;
};

export const driftService = {
    // Record where a file came from
    async recordFileOrigin(
        projectId: string,
        filePath: string,
        meta: {
            source: FileOriginRecord['origin_source'];
            tool?: string;
            hash?: string;
        }
    ) {
        await db`
      INSERT INTO file_origins (
        project_id, file_path, origin_source, origin_tool, initial_hash, current_status
      )
      VALUES (
        ${projectId}, 
        ${filePath}, 
        ${meta.source}, 
        ${meta.tool ?? null}, 
        ${meta.hash ?? null}, 
        'synced'
      )
      ON CONFLICT (project_id, file_path) 
      DO UPDATE SET 
        origin_source = EXCLUDED.origin_source,
        origin_tool = EXCLUDED.origin_tool,
        updated_at = NOW()
    `;
    },

    // Update status when drift is detected
    async updateDriftStatus(
        projectId: string,
        filePath: string,
        status: FileOriginRecord['current_status'],
        riskScore = 0
    ) {
        await db`
      UPDATE file_origins
      SET 
        current_status = ${status},
        risk_score = ${riskScore},
        updated_at = NOW()
      WHERE project_id = ${projectId} AND file_path = ${filePath}
    `;
    },

    async getProjectDrift(projectId: string) {
        return db<FileOriginRecord[]>`
      SELECT * FROM file_origins
      WHERE project_id = ${projectId}
      AND current_status != 'synced'
      ORDER BY risk_score DESC
    `;
    }
};
