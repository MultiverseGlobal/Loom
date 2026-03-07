import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { createHash } from 'node:crypto';

export interface AuthenticatedRequest extends FastifyRequest {
    userId?: string;
    extensionId?: string;
}

/**
 * Middleware to verify Loom API keys
 */
export async function verifyApiKey(
    request: AuthenticatedRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            reply.status(401).send({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'No API key provided'
                }
            });
            return;
        }

        const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
        const hashedKey = createHash("sha256").update(apiKey).digest("hex");

        // 1. Check api_keys table
        const [keyRecord] = await db`
            SELECT user_id FROM api_keys WHERE key_hash = ${hashedKey}
        `;

        if (keyRecord) {
            request.userId = keyRecord.user_id;
            return;
        }

        // 2. Check extensions table
        const [extensionRecord] = await db`
            SELECT id, user_id FROM extensions WHERE token = ${hashedKey}
        `;

        if (extensionRecord) {
            request.userId = extensionRecord.user_id;
            request.extensionId = extensionRecord.id;
            return;
        }

        // 3. Fallback: Invalid key
        reply.status(401).send({
            success: false,
            error: {
                code: 'INVALID_KEY',
                message: 'Invalid or revoked API key'
            }
        });
        return;

    } catch (error: any) {
        console.error('API Key middleware error:', error);
        reply.status(500).send({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Internal authentication error'
            }
        });
    }
}

export const requireApiKey = verifyApiKey;
