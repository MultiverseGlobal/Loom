import { broadcastToProject } from "./websocket.js";

/**
 * Simple wrapper for Socket broadcasting across the Gateway.
 */
export const socketService = {
  broadcast: (projectId: string | null, type: string, payload: any) => {
    if (!projectId) {
      console.warn(`[SocketService] Cannot broadcast '${type}' without a valid Project ID.`);
      return;
    }
    
    broadcastToProject(projectId, {
      type,
      payload
    });
  }
};
