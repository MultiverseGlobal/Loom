import { db } from "../db/client.js";

export type ActivityAction =
    | 'PROJECT_CREATED'
    | 'CODE_GENERATED'
    | 'EXPORT_GITHUB'
    | 'ANALYSIS_STARTED'
    | 'AUTH_LOGIN'
    | 'SETTINGS_UPDATED';

export async function logActivity(
    userId: string,
    action: ActivityAction,
    metadata: Record<string, any> = {},
    ipAddress?: string
) {
    try {
        await db`
      INSERT INTO activity_logs (user_id, action, metadata, ip_address)
      VALUES (${userId}, ${action}, ${db.json(metadata)}, ${ipAddress ?? null})
    `;
    } catch (error) {
        console.error(`Failed to log activity: ${action} for user ${userId}`, error);
        // Don't throw, as activity logging shouldn't break the main flow
    }
}
