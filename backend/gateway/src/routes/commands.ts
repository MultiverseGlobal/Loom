import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as commandService from "../services/commandService.js";
import { aiEngine } from "../services/ai-engine.js";
import { createHash } from "node:crypto";

// Type augmentation for Fastify to include user/userId from middleware
declare module "fastify" {
    interface FastifyRequest {
        userId?: string;
        user?: {
            id: string;
            [key: string]: any;
        };
    }
}

// Common error schemas
const errorResponseSchema = z.object({
    error: z.string(),
});

import { requireApiKey } from "../middleware/key-auth.js";

// Request schemas
const registerDeviceSchema = z.object({
    device_id: z.string().min(1),
    ide_type: z.enum(["vscode", "webstorm", "cursor"]),
    device_name: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
});

const createCommandSchema = z.object({
    device_id: z.string().uuid(),
    command_type: z.enum(["IMPORT_PROJECT", "ANALYZE_WORKSPACE", "SYNC_CHANGES", "APPLY_CHANGES"]),
    project_id: z.string().uuid().optional(),
    payload: z.record(z.unknown()),
    priority: z.number().int().min(0).max(10).default(0),
    expires_in_seconds: z.number().int().positive().optional(),
});

const completeCommandSchema = z.object({
    result: z.record(z.unknown()).optional(),
    error: z.string().optional(),
});

export async function registerCommandRoutes(app: FastifyInstance) {
    // Extension registers device
    // Auth: API key in Authorization header
    app.post(
        "/devices/register",
        {
            schema: {
                body: registerDeviceSchema,
                response: {
                    200: z.object({
                        device: z.object({
                            id: z.string(),
                            device_id: z.string(),
                            status: z.string(),
                        }),
                    }),
                    401: errorResponseSchema,
                },
            },
            preHandler: [requireApiKey]
        },
        async (request, reply) => {
            const userId = request.userId;
            if (!userId) {
                return reply.code(401).send({ error: "Unauthorized" });
            }

            const body = request.body as z.infer<typeof registerDeviceSchema>;

            const device = await commandService.registerDevice(
                userId,
                body.device_id,
                body.ide_type,
                "API_KEY_AUTH", // Placeholder since we already validated the key
                body.device_name,
                body.metadata
            );

            return { device: { id: device.id, device_id: device.device_id, status: device.status } };
        }
    );

    // Extension polls for commands
    // Auth: device_id in query param + API key validation
    app.get(
        "/commands/poll",
        {
            schema: {
                querystring: z.object({
                    device_id: z.string(),
                    limit: z.coerce.number().int().positive().max(50).default(10),
                }),
                response: {
                    200: z.object({
                        commands: z.array(z.any()),
                    }),
                    401: errorResponseSchema,
                    404: errorResponseSchema,
                },
            },
            preHandler: [requireApiKey]
        },
        async (request, reply) => {
            const userId = request.userId;
            if (!userId) {
                return reply.code(401).send({ error: "Unauthorized" });
            }
            const query = request.query as { device_id: string; limit?: number };

            // Validate device exists and belongs to user
            const device = await commandService.getDeviceByDeviceId(query.device_id);
            if (!device) {
                return reply.code(404).send({ error: "Device not found" });
            }
            if (device.user_id !== userId) {
                return reply.code(401).send({ error: "Invalid device for this user" });
            }

            const commands = await commandService.pollCommands(device.id, query.limit || 10);

            // Auto-mark commands as executing when polled
            for (const cmd of commands) {
                await commandService.startCommand(cmd.id);
            }

            return { commands };
        }
    );

    // Extension reports command completion
    app.post(
        "/commands/:commandId/complete",
        {
            schema: {
                params: z.object({
                    commandId: z.string().uuid(),
                }),
                body: completeCommandSchema,
                response: {
                    200: z.object({
                        success: z.boolean(),
                    }),
                    404: errorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const { commandId } = request.params as { commandId: string };
            const body = request.body as z.infer<typeof completeCommandSchema>;

            const command = await commandService.getCommand(commandId);
            if (!command) {
                return reply.code(404).send({ error: "Command not found" });
            }

            if (body.error) {
                await commandService.failCommand(commandId, body.error);
            } else {
                await commandService.completeCommand(commandId, body.result);
            }

            return { success: true };
        }
    );

    // Web app creates command
    // Auth: User session/token
    app.withTypeProvider().post(
        "/commands/create",
        {
            schema: {
                body: createCommandSchema,
                response: {
                    201: z.object({
                        command_id: z.string(),
                        status: z.literal("queued"),
                    }),
                    401: errorResponseSchema,
                    403: errorResponseSchema,
                    404: errorResponseSchema,
                    500: errorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const userId = request.user?.id;
            if (!userId) {
                return reply.code(401).send({ error: "Unauthorized" });
            }

            const body = request.body as z.infer<typeof createCommandSchema>;

            // Verify device belongs to user
            const device = await commandService.getDeviceByDeviceId(body.device_id);
            if (!device) {
                return reply.code(404).send({ error: "Device not found" });
            }

            if (device.user_id !== userId) {
                return reply.code(403).send({ error: "Device does not belong to this user" });
            }

            let finalPayload = body.payload;

            // INTELLIGENCE LAYER:
            // If importing a project without a pre-built blueprint (UPG), generate one.
            if (body.command_type === "IMPORT_PROJECT" && body.payload.sourceType && !body.payload.upg) {
                try {
                    const sourceType = String(body.payload.sourceType);
                    const sourceUrl = String(body.payload.sourceUrl || "");
                    const projectName = String(body.payload.projectName || "Imported Project");

                    request.log.info(`Generating blueprint for ${projectName} from ${sourceType}...`);

                    const upg = await aiEngine.generateBlueprint(sourceType, { url: sourceUrl, ...body.payload }, projectName);

                    finalPayload = {
                        ...body.payload,
                        upg
                    };
                } catch (error) {
                    request.log.error({ error }, "Failed to generate blueprint");
                    return reply.code(500).send({ error: "Failed to analyze source project" });
                }
            }

            const command = await commandService.createCommand(
                userId,
                device.id,
                body.command_type,
                finalPayload,
                body.project_id,
                body.priority,
                body.expires_in_seconds
            );

            return reply.code(201).send({
                command_id: command.id,
                status: "queued" as const,
            });
        }
    );

    // Get command history for a project
    app.get(
        "/commands/project/:projectId",
        {
            schema: {
                params: z.object({
                    projectId: z.string().uuid(),
                }),
                querystring: z.object({
                    limit: z.coerce.number().int().positive().max(200).default(50),
                }),
                response: {
                    200: z.object({
                        commands: z.array(z.any()),
                    }),
                    401: errorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const userId = request.user?.id;
            if (!userId) {
                return reply.code(401).send({ error: "Unauthorized" });
            }

            const { projectId } = request.params as { projectId: string };
            const { limit } = request.query as { limit?: number };

            const history = await commandService.getProjectCommandHistory(projectId, limit || 50);

            return { commands: history };
        }
    );

    // Get user's devices
    app.get("/devices", {
        schema: {
            response: {
                200: z.object({
                    devices: z.array(z.any()),
                }),
                401: errorResponseSchema,
            }
        }
    }, async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.code(401).send({ error: "Unauthorized" });
        }

        const devices = await commandService.getUserDevices(userId);
        return { devices };
    });

    // Health check for cleanup tasks
    app.post("/commands/cleanup", async (request, reply) => {
        const expiredCount = await commandService.cleanupExpiredCommands();
        const offlineCount = await commandService.markInactiveDevicesOffline();

        return {
            expired_commands_removed: expiredCount,
            devices_marked_offline: offlineCount,
        };
    });
}
