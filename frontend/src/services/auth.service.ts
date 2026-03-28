import { createClient } from '@/lib/supabase';

export const authService = {
    async signUp(email: string, password: string, fullName: string) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback?next=/onboarding/connect`
                    : undefined,
            },
        });
        return { data, error };
    },

    async signIn(email: string, password: string) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    async signOut() {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getUser() {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // --- LOCAL BYPASS START ---
        if (!user && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            console.warn('[AUTH] LOCAL BYPASS: Returning mock local user');
            return {
                id: '3f3e183a-b144-4882-9014-ea5aa1a2d585',
                email: 'bytemge@gmail.com',
                user_metadata: { full_name: 'Local Hero' }
            };
        }
        // --- LOCAL BYPASS END ---

        return user;
    },

    async getSession() {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },

    async signInWithGithub() {
        console.log('[AUTH SERVICE] signInWithGithub called');
        try {
            const supabase = createClient();
            console.log('[AUTH SERVICE] Supabase client created. Origin:', typeof window !== 'undefined' ? window.location.origin : 'server');
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    scopes: 'repo',
                    redirectTo: typeof window !== 'undefined'
                        ? `${window.location.origin}/auth/callback?next=/dashboard`
                        : undefined,
                },
            });

            if (error) console.error('[AUTH SERVICE] signInWithOAuth error:', error);
            else console.log('[AUTH SERVICE] signInWithOAuth success (redirect should follow)');

            return { data, error };
        } catch (err: any) {
            console.error('[AUTH SERVICE] signInWithGithub exception:', err);
            return { data: null, error: err };
        }
    },
};
