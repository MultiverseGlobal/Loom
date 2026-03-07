import { supabase } from "../lib/supabase.js";
import { randomBytes, createHash } from "node:crypto";

export const extensionService = {
  /**
   * Generate a one-time pairing code for a user
   */
  async generatePairingCode(userId: string): Promise<string> {
    // Format: XXX-XXX
    const code = randomBytes(3).toString('hex').toUpperCase();
    const formattedCode = `${code.slice(0, 3)}-${code.slice(3, 6)}`;

    const { error } = await supabase
      .from('pairing_codes')
      .insert({ user_id: userId, code: formattedCode });

    if (error) throw error;

    return formattedCode;
  },

  /**
   * Exchange a pairing code for an extension token
   */
  async exchangePairingCode(code: string, machineInfo: any): Promise<{ token: string, user_id: string } | null> {
    const { data: record, error: updateError } = await supabase
      .from('pairing_codes')
      .update({ is_used: true })
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .select('user_id')
      .single();

    if (updateError || !record) return null;

    // Generate a permanent API key for this extension instance
    const rawKey = `loom_ext_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const { error: keyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: record.user_id,
        key_hash: keyHash,
        name: `Extension: ${machineInfo.os || 'Unknown'}`,
        type: 'extension'
      });

    if (keyError) throw keyError;

    return { token: rawKey, user_id: record.user_id };
  },

  /**
   * Initialize a device flow pairing session
   */
  async initDeviceFlow(deviceId: string, machineInfo: any): Promise<{ pairing_id: string, expires_in: number }> {
    const expiresIn = 600; // 10 minutes
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { data, error } = await supabase
      .from('pairing_sessions')
      .insert({
        device_id: deviceId,
        machine_info: machineInfo,
        expires_at: expiresAt
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error inserting pairing session:", error);
      throw error;
    }

    return {
      pairing_id: data.id,
      expires_in: expiresIn
    };
  },

  /**
   * Poll for device flow authorization status
   */
  async pollDeviceFlow(pairingId: string): Promise<{ status: string, token?: string }> {
    const { data: session, error } = await supabase
      .from('pairing_sessions')
      .select('status, extension_token, expires_at')
      .eq('id', pairingId)
      .single();

    if (error || !session) return { status: 'unknown' };

    if (new Date(session.expires_at) < new Date()) {
      return { status: 'expired' };
    }

    return {
      status: session.status,
      token: session.extension_token
    };
  },

  /**
   * Authorize a pairing session (User clicked "Connect" in web UI)
   */
  async authorizeDeviceSession(pairingId: string, userId: string): Promise<void> {
    const { data: session, error: fetchError } = await supabase
      .from('pairing_sessions')
      .select('*')
      .eq('id', pairingId)
      .single();

    if (fetchError || !session) throw new Error("Session not found");
    if (session.status !== 'pending') throw new Error("Session is not pending");

    // Generate token
    const rawKey = `loom_ext_${randomBytes(24).toString('hex')}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    // 1. Create API Key
    const { error: keyError } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: keyHash,
        name: `Extension: ${session.machine_info?.hostname || 'Unknown'}`,
        type: 'extension'
      });

    if (keyError) throw keyError;

    // 2. Create/Update Extension record (for Dashboard visibility)
    const { error: extError } = await supabase
      .from('extensions')
      .upsert({
        id: session.device_id,
        user_id: userId,
        token: keyHash, // STORE TOKEN SO requireApiKey CAN INVALIDATE IT VIA DELETE
        machine_info: session.machine_info,
        last_seen: new Date().toISOString(),
        version: session.machine_info?.version || '0.0.0'
      });

    if (extError) throw extError;

    // 3. Update Session with Token (so device can poll it)
    const { error: updateError } = await supabase
      .from('pairing_sessions')
      .update({
        status: 'authorized',
        extension_token: rawKey,
        user_id: userId
      })
      .eq('id', pairingId);

    if (updateError) throw updateError;
  },

  /**
   * Remove an extension (Disconnect)
   */
  async deleteExtension(deviceId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('extensions')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
};
