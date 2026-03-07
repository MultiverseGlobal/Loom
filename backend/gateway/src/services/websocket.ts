console.log('[DEBUG] Loading websocket.ts');
import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from '@fastify/websocket';
import { createHash } from 'node:crypto';
import * as commandService from './commandService.js';

interface WebSocketMessage {
    type: 'AUTH' | 'FILE_CHANGE' | 'COMMAND_RESULT' | 'PING';
    payload: any;
}

// Map<ProjectId, Set<Socket>>
const projectConnections = new Map<string, Set<any>>();
// Map<DeviceId, Socket>
const deviceConnections = new Map<string, any>();

export async function registerWebsocketRoutes(app: FastifyInstance) {
    app.log.info("WebSocket routes initialized");

    (app as any).get('/ws', { websocket: true }, (connection: any, req: FastifyRequest) => {
        // The connection object IS the socket in @fastify/websocket
        const socket = connection;

        if (!socket || typeof socket.on !== 'function') {
            app.log.error({
                type: typeof connection,
                keys: Object.keys(connection).slice(0, 5)
            }, "WebSocket connection failed: Invalid socket object");
            return;
        }

        let authenticatedDeviceId: string | null = null;
        let authenticatedProjectId: string | null = null;
        let authenticatedUserId: string | null = null;

        socket.on('message', async (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString()) as WebSocketMessage;

                if (data.type === 'PING') {
                    socket.send(JSON.stringify({ type: 'PONG' }));
                    return;
                }

                // 0. Refresh last_seen if authenticated
                if (authenticatedDeviceId) {
                    await commandService.touchDevice(authenticatedDeviceId);
                }

                // 1. Authentication Handshake
                if (data.type === 'AUTH') {
                    const { apiKey, deviceId, projectId } = data.payload;

                    if (!apiKey) {
                        socket.send(JSON.stringify({ type: 'ERROR', message: 'Missing API Key' }));
                        return;
                    }

                    // Verify API Key matches a device
                    // For MVP simplicity: Hash key and check DB
                    // In real app, we might check session for web clients vs API key for devices

                    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

                    // Allow simple "web-client" auth or "device" auth
                    if (deviceId) {
                        // Device Auth
                        const device = await commandService.getDeviceByDeviceId(deviceId);
                        if (!device || device.token !== apiKeyHash) {
                            socket.send(JSON.stringify({ type: 'ERROR', message: 'Invalid Device Credentials' }));
                            return;
                        }

                        authenticatedDeviceId = device.id;
                        authenticatedUserId = device.user_id;
                        deviceConnections.set(device.id, socket);

                        app.log.info(`Device ${deviceId} connected via WS`);

                        // If device sends projectId, join that room too
                        if (projectId) {
                            authenticatedProjectId = projectId;
                            joinProjectRoom(projectId, socket);
                        }

                        socket.send(JSON.stringify({ type: 'AUTH_SUCCESS', role: 'DEVICE' }));

                    } else {
                        // Web Client Auth (Simplified for MVP, ideally use Session cookie)
                        // For now, assume web client passes a valid project token or similar
                        // Mocking web auth success for "watch mode"
                        if (projectId) {
                            authenticatedProjectId = projectId;
                            joinProjectRoom(projectId, socket);
                            socket.send(JSON.stringify({ type: 'AUTH_SUCCESS', role: 'WEB' }));
                        }
                    }
                    return;
                }

                // 2. Handle File Changes (Sync)
                if (data.type === 'FILE_CHANGE') {
                    if (!authenticatedDeviceId && !authenticatedProjectId) {
                        socket.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized' }));
                        return;
                    }

                    // Broadcast to everyone else in the project
                    if (authenticatedProjectId) {
                        broadcastToProject(authenticatedProjectId, data, socket);
                    }
                }

            } catch (err) {
                app.log.error({ err }, "WebSocket message error");
            }
        });

        socket.on('close', () => {
            if (authenticatedDeviceId) {
                deviceConnections.delete(authenticatedDeviceId);
            }
            if (authenticatedProjectId) {
                leaveProjectRoom(authenticatedProjectId, socket);
            }
        });
    });
}

function joinProjectRoom(projectId: string, socket: any) {
    if (!projectConnections.has(projectId)) {
        projectConnections.set(projectId, new Set());
    }
    projectConnections.get(projectId)?.add(socket);
}

function leaveProjectRoom(projectId: string, socket: any) {
    const connections = projectConnections.get(projectId);
    if (connections) {
        connections.delete(socket);
        if (connections.size === 0) {
            projectConnections.delete(projectId);
        }
    }
}

export function broadcastToProject(projectId: string, message: any, excludeSocket?: any) {
    const connections = projectConnections.get(projectId);
    if (connections) {
        connections.forEach(client => {
            if (client !== excludeSocket && client.readyState === 1) { // OPEN
                client.send(JSON.stringify(message));
            }
        });
    }
}

export function sendToDevice(deviceId: string, message: any) {
    const client = deviceConnections.get(deviceId);
    if (client && client.readyState === 1) {
        client.send(JSON.stringify(message));
        return true;
    }
    return false;
}
