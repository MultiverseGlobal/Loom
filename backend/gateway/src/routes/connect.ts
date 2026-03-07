import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from '../middleware/supabase-auth.js';
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import postgres from "postgres";

const db = postgres(process.env.DATABASE_URL!);

export async function registerConnectRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    /**
     * EXTENSION: Start a connection session
     * Generates a session and returns the URL for the user to visit
     */
    typedApp.post("/connect/start", {
        schema: {
            body: z.object({
                session_id: z.string().uuid(),
                device_id: z.string().optional(),
                machine_info: z.record(z.any()).optional()
            })
        }
    }, async (request, reply) => {
        const { session_id, device_id, machine_info } = request.body;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await db`
            INSERT INTO pairing_sessions (id, device_id, machine_info, status, expires_at)
            VALUES (${session_id}, ${device_id || session_id}, ${db.json(machine_info || {})}, 'pending', ${expiresAt})
        `;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        return {
            session_id,
            verification_url: `${baseUrl}/connect?session_id=${session_id}`
        };
    });

    /**
     * EXTENSION: Poll for sync status
     * Checks if the session has been authorized
     */
    typedApp.get("/connect/sync", {
        schema: {
            querystring: z.object({
                session_id: z.string().uuid()
            })
        }
    }, async (request, reply) => {
        const { session_id } = request.query;

        const { data: session, error } = await supabase
            .from('pairing_sessions')
            .select('status, extension_token, expires_at')
            .eq('device_id', session_id)
            .single();

        if (error || !session) {
            return reply.status(404).send({ error: "Session not found" });
        }

        if (new Date(session.expires_at) < new Date()) {
            return reply.status(410).send({ error: "Session expired", status: 'expired' });
        }

        if (session.status === 'pending') {
            return { status: 'pending' };
        }

        if (session.status === 'authorized' && session.extension_token) {
            // AUTHORIZED: Return the token one time. 
            // Ideally we should delete or invalidate this token transport mechanism after fetch, 
            // but for now we rely on the short TTL of the session.
            return {
                status: 'authorized',
                token: session.extension_token
            };
        }

        return { status: session.status };
    });

    /**
     * WEB: Approve the connection
     * User must be authenticated
     */
    typedApp.post("/connect/approve", {
        schema: {
            body: z.object({
                session_id: z.string().uuid()
            })
        },
        preHandler: [requireAuth]
    }, async (request, reply) => {
        const userId = request.userId;
        const { session_id } = request.body;

        // 1. Verify session exists and is pending
        const { data: session, error: fetchError } = await supabase
            .from('pairing_sessions')
            .select('*')
            .eq('device_id', session_id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !session) {
            return reply.status(404).send({ error: "Invalid or expired session" });
        }

        if (new Date(session.expires_at) < new Date()) {
            return reply.status(410).send({ error: "Session expired" });
        }

        // 2. Generate a long-lived extension token
        const rawToken = "loom_" + randomBytes(32).toString('hex');
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");

        // 3. Create the Extension record (Permanent)
        await db`
            INSERT INTO extensions (id, user_id, token, machine_info, last_seen)
            VALUES (${session.device_id}, ${userId}, ${tokenHash}, ${db.json(session.machine_info || {})}, NOW())
            ON CONFLICT (id) DO UPDATE SET 
              user_id = EXCLUDED.user_id,
              token = EXCLUDED.token,
              machine_info = EXCLUDED.machine_info,
              last_seen = NOW()
        `;

        // 4. Update the Session with the RAW token (Temporary transport)
        // CAUTION: This stores the raw token briefly in the DB so the extension can fetch it.
        // It's acceptable because the session expires quickly.
        const { error: updateError } = await supabase
            .from('pairing_sessions')
            .update({
                status: 'authorized',
                user_id: userId,
                extension_token: rawToken // THE RAW TOKEN for the extension to grab
            })
            .eq('id', session.id); // Securely update by PK

        if (updateError) {
            request.log.error(updateError);
            return reply.status(500).send({ error: "Failed to authorize session" });
        }

        return { success: true };
    });
}
