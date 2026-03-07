import { createClient } from "@/lib/supabase";
import { fetchAPI } from "@/utils/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export interface CommandPayload {
    device_id: string;
    command_type: 'IMPORT_PROJECT' | 'ANALYZE_WORKSPACE' | 'SYNC_CHANGES' | 'APPLY_CHANGES';
    payload: any;
    project_id?: string;
    priority?: number;
}

export const commandService = {
    async getAuthHeader() {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Authorization': `Bearer ${session?.access_token}` };
    },

    async listDevices() {
        // fetchAPI handles prepending /api and API_URL
        const data = await fetchAPI<{ devices: any[] }>('/devices');
        return data.devices || [];
    },

    async createCommand(payload: CommandPayload) {
        return fetchAPI('/commands/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
};
