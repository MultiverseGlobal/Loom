import { db } from "../db/client.js";

export interface IdeDevice {
  id: string;
  user_id: string;
  machine_info?: {
    os: string;
    ide: string;
    version?: string;
    hostname?: string;
  };
  last_seen: Date;
  token?: string;
  created_at: Date;
  status: "online" | "offline";
}

export interface Command {
  id: string;
  user_id: string;
  device_id: string;
  command_type: "IMPORT_PROJECT" | "ANALYZE_WORKSPACE" | "SYNC_CHANGES" | "APPLY_CHANGES";
  project_id?: string;
  payload: Record<string, unknown>;
  status: "pending" | "executing" | "completed" | "failed";
  priority: number;
  result?: Record<string, unknown>;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  expires_at?: Date;
}

/**
 * Register a new IDE device or update if exists
 */
export async function registerDevice(
  userId: string,
  deviceId: string,
  machineInfo: any
): Promise<IdeDevice> {
  const rows = await db<IdeDevice[]>`
    INSERT INTO extensions (id, user_id, machine_info, last_seen)
    VALUES (${deviceId}, ${userId}, ${JSON.stringify(machineInfo)}, NOW())
    ON CONFLICT (id) 
    DO UPDATE SET 
      last_seen = NOW(),
      machine_info = EXCLUDED.machine_info
    RETURNING *
  `;
  return {
    ...rows[0],
    status: (new Date().getTime() - new Date(rows[0].last_seen).getTime() < 30000) ? 'online' : 'offline'
  };
}

/**
 * Refresh last_seen for a device
 */
export async function touchDevice(deviceId: string): Promise<void> {
  await db`
    UPDATE extensions SET last_seen = NOW() WHERE id = ${deviceId}
  `;
}

/**
 * Get device by device_id
 */
export async function getDeviceByDeviceId(deviceId: string): Promise<IdeDevice | null> {
  const rows = await db<IdeDevice[]>`
    SELECT * FROM extensions WHERE id = ${deviceId}
  `;
  return rows[0] ?? null;
}

/**
 * Get all devices for a user
 */
export async function getUserDevices(userId: string): Promise<IdeDevice[]> {
  const rows = await db`
    SELECT * FROM extensions WHERE user_id = ${userId} ORDER BY last_seen DESC
  `;

  const devices = rows.map(r => ({
    ...r,
    status: (new Date().getTime() - new Date(r.last_seen).getTime() < 30000) ? 'online' : 'offline'
  })) as IdeDevice[];

  // In Local Mode, ensure we have a virtual "Local Engine" device that is always "online"
  if (process.env.LOCAL_MODE === 'true' || userId === '3f3e183a-b144-4882-9014-ea5aa1a2d585') {
    const localDeviceId = 'LOCAL-ENGINE-001';
    const hasLocal = devices.some(d => d.id === localDeviceId);

    if (!hasLocal) {
      devices.push({
        id: localDeviceId,
        user_id: userId,
        machine_info: {
          os: process.platform,
          ide: 'Mirrorverse Local Engine',
          hostname: 'localhost'
        },
        last_seen: new Date(),
        created_at: new Date(),
        status: 'online'
      });
    } else {
      // Force status to online for the local engine
      const local = devices.find(d => d.id === localDeviceId);
      if (local) local.status = 'online';
    }
  }

  return devices;
}

/**
 * Ensure a local device exists in the database
 */
export async function ensureLocalDevice(userId: string): Promise<void> {
  const localDeviceId = 'LOCAL-ENGINE-001';
  const dummyToken = 'local-engine-token-unlocked';
  await db`
        INSERT INTO extensions (id, user_id, machine_info, last_seen, token)
        VALUES (
            ${localDeviceId}, 
            ${userId}, 
            ${JSON.stringify({ os: process.platform, ide: 'Mirrorverse Local Engine', hostname: 'localhost' })}, 
            NOW(),
            ${dummyToken}
        )
        ON CONFLICT (id) DO UPDATE SET last_seen = NOW()
    `;
}

/**
 * Create a new command
 */
export async function createCommand(
  userId: string,
  deviceId: string,
  commandType: Command["command_type"],
  payload: Record<string, unknown>,
  projectId?: string,
  priority: number = 0,
  expiresInSeconds?: number
): Promise<Command> {
  const expiresAt = expiresInSeconds
    ? new Date(Date.now() + expiresInSeconds * 1000)
    : null;

  const rows = await db<Command[]>`
    INSERT INTO commands (user_id, device_id, command_type, project_id, payload, priority, expires_at)
    VALUES (${userId}, ${deviceId}, ${commandType}, ${projectId ?? null}, ${JSON.stringify(payload)}, ${priority}, ${expiresAt})
    RETURNING *
  `;
  return rows[0];
}

/**
 * Poll for pending commands for a device
 */
export async function pollCommands(deviceId: string, limit: number = 10): Promise<Command[]> {
  return db<Command[]>`
    SELECT * FROM commands 
    WHERE device_id = ${deviceId} 
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY priority DESC, created_at ASC
    LIMIT ${limit}
  `;
}

/**
 * Update command status to executing
 */
export async function startCommand(commandId: string): Promise<void> {
  await db`
    UPDATE commands 
    SET status = 'executing', started_at = NOW()
    WHERE id = ${commandId}
  `;
}

/**
 * Complete a command successfully
 */
export async function completeCommand(
  commandId: string,
  result?: Record<string, unknown>
): Promise<void> {
  await db`
    UPDATE commands 
    SET status = 'completed', 
        completed_at = NOW(),
        result = ${result ? JSON.stringify(result) : null}
    WHERE id = ${commandId}
  `;
}

/**
 * Fail a command with error message
 */
export async function failCommand(
  commandId: string,
  errorMessage: string
): Promise<void> {
  await db`
    UPDATE commands 
    SET status = 'failed', 
        completed_at = NOW(),
        error_message = ${errorMessage}
    WHERE id = ${commandId}
  `;
}

/**
 * Get command by ID
 */
export async function getCommand(commandId: string): Promise<Command | null> {
  const rows = await db<Command[]>`
    SELECT * FROM commands WHERE id = ${commandId}
  `;
  return rows[0] ?? null;
}

/**
 * Get command history for a project
 */
export async function getProjectCommandHistory(projectId: string, limit: number = 50): Promise<Command[]> {
  return db<Command[]>`
    SELECT c.*, d.machine_info, 'vscode' as ide_type
    FROM commands c
    LEFT JOIN extensions d ON c.device_id = d.id
    WHERE c.project_id = ${projectId} 
    ORDER BY c.created_at DESC 
    LIMIT ${limit}
  `;
}

/**
 * Get command history for a user
 */
export async function getUserCommandHistory(userId: string, limit: number = 100): Promise<Command[]> {
  return db<Command[]>`
    SELECT c.*, d.machine_info, 'vscode' as ide_type
    FROM commands c
    LEFT JOIN extensions d ON c.device_id = d.id
    WHERE c.user_id = ${userId} 
    ORDER BY c.created_at DESC 
    LIMIT ${limit}
  `;
}

/**
 * Cleanup expired commands
 */
export async function cleanupExpiredCommands(): Promise<number> {
  const rows = await db`
    DELETE FROM commands 
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW()
      AND status = 'pending'
    RETURNING id
  `;
  return rows.length;
}

/**
 * Mark inactive devices as offline
 */
export async function markInactiveDevicesOffline(): Promise<number> {
  // Direct status column doesn't exist, we don't need a background mark-offline task
  // if we calculate it on the fly, but this function might be used for other purposes.
  // For now, let's keep it as a no-op or remove it if not used.
  return 0;
}
