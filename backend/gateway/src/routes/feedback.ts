import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";

export async function registerFeedbackRoutes(app: FastifyInstance) {
    // List feature requests
    app.get("/feedback", async (request, reply) => {
        const requests = await db`
            SELECT * FROM feature_requests 
            ORDER BY votes DESC, created_at DESC
            LIMIT 50
        `;
        return { requests };
    });

    // Submit feedback
    app.post("/feedback", {
        schema: {
            body: z.object({
                title: z.string().min(3),
                description: z.string().min(10)
            })
        }
    }, async (request, reply) => {
        const userId = "user_123";
        const { title, description } = request.body as { title: string, description: string };

        const result = await db`
            INSERT INTO feature_requests (user_id, title, description, status, votes)
            VALUES (${userId}, ${title}, ${description}, 'pending', 1)
            RETURNING *
        `;

        return { request: result[0] };
    });

    // Vote for feedback
    app.post("/feedback/:id/vote", async (request, reply) => {
        const { id } = request.params as { id: string };
        // Simple increment for MVP (no user-vote tracking table yet)
        const result = await db`
            UPDATE feature_requests
            SET votes = votes + 1
            WHERE id = ${id}
            RETURNING votes
         `;
        return { votes: result[0]?.votes };
    });
}
