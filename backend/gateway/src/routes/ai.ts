import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
    createConversation,
    addMessage,
    getConversationHistory,
    listUserConversations
} from "../services/aiService.js";
import { requireAuth } from '../middleware/supabase-auth.js';

const conversationResponse = z.object({
    id: z.string(),
    user_id: z.string(),
    project_id: z.string().nullable(),
    title: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
});

const messageResponse = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    metadata: z.any().optional(),
    created_at: z.string(),
});

export async function registerAiRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    // List all conversations for the user
    typedApp.get(
        "/conversations",
        {
            schema: {
                response: { 200: z.array(conversationResponse) },
            },
            preHandler: [requireAuth],
        },
        async (request) => {
            const userId = (request as any).userId;
            const convos = await listUserConversations(userId);
            return convos as any;
        }
    );

    // Create a new conversation
    typedApp.post(
        "/conversations",
        {
            schema: {
                body: z.object({
                    projectId: z.string().uuid().optional(),
                    title: z.string().optional(),
                }),
                response: { 201: z.object({ id: z.string() }) },
            },
            preHandler: [requireAuth],
        },
        async (request, reply) => {
            const { projectId, title } = request.body;
            const userId = (request as any).userId;
            const id = await createConversation(userId, projectId, title);
            return reply.code(201).send({ id });
        }
    );

    // Get conversation history
    typedApp.get(
        "/conversations/:id/messages",
        {
            schema: {
                params: z.object({ id: z.string().uuid() }),
                response: { 200: z.array(messageResponse) },
            },
            preHandler: [requireAuth],
        },
        async (request) => {
            const params = request.params as any;
            const history = await getConversationHistory(params.id);
            return history as any;
        }
    );

    // Add a message to a conversation
    typedApp.post(
        "/conversations/:id/messages",
        {
            schema: {
                params: z.object({ id: z.string().uuid() }),
                body: z.object({
                    role: z.enum(['user', 'assistant', 'system']),
                    content: z.string(),
                    metadata: z.record(z.any()).optional(),
                }),
                response: { 201: z.object({ success: z.boolean() }) },
            },
            preHandler: [requireAuth],
        },
        async (request, reply) => {
            const params = request.params as any;
            const { role, content, metadata } = request.body;
            await addMessage(params.id, role, content, metadata);
            return reply.code(201).send({ success: true });
        }
    );
}
