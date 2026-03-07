import { createClient } from "@/lib/supabase";
import { fetchAPI } from "@/utils/api";

export interface AIConversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
    created_at: string;
}

export const aiService = {
    async getAuthHeader() {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Authorization': `Bearer ${session?.access_token}` };
    },

    async listConversations(): Promise<AIConversation[]> {
        const headers = await this.getAuthHeader();
        return fetchAPI<AIConversation[]>('/conversations', { headers });
    },

    async createConversation(projectId?: string, title?: string): Promise<{ id: string }> {
        const headers = await this.getAuthHeader();
        return fetchAPI<{ id: string }>('/conversations', {
            method: 'POST',
            headers,
            body: JSON.stringify({ projectId, title })
        });
    },

    async getMessages(conversationId: string): Promise<AIMessage[]> {
        const headers = await this.getAuthHeader();
        return fetchAPI<AIMessage[]>(`/conversations/${conversationId}/messages`, { headers });
    },

    async addMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void> {
        const headers = await this.getAuthHeader();
        await fetchAPI<void>(`/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ role, content, metadata })
        });
    }
};
