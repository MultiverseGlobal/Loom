import { FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

console.error('[MIDDLEWARE] Supabase URL from config:', supabaseUrl?.substring(0, 30) + '...');
console.error('[MIDDLEWARE] Supabase Anon Key from config:', supabaseAnonKey ? 'SET' : 'EMPTY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars missing in middleware. Auth will fail.');
}

export interface AuthenticatedRequest extends FastifyRequest {
    userId?: string;
    user?: any;
}

/**
 * Middleware to verify Supabase session tokens
 * Extracts the token from Authorization header and verifies it with Supabase
 */
export async function verifySupabaseToken(
    request: AuthenticatedRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const authHeader = request.headers.authorization;
        console.error('[AUTH] Request to:', request.url);
        console.error('[AUTH] Has auth header:', !!authHeader);

        // --- LOCAL BYPASS START ---
        // If we are in local mode, ALWAYS bypass Supabase auth, even if a token is present.
        // This prevents issues where the IDE/Frontend sends a stale/invalid token that causes
        // the Gateway to try (and fail) to verify it with Supabase.
        const isLocal = request.hostname === 'localhost' || request.hostname === '127.0.0.1' || process.env.LOCAL_MODE === 'true';
        if (isLocal) {
            console.error('[AUTH] LOCAL BYPASS: Using default local user (ignoring token)');
            const localUserId = '3f3e183a-b144-4882-9014-ea5aa1a2d585'; // bytemge@gmail.com
            request.userId = localUserId;
            request.user = { id: localUserId, email: 'bytemge@gmail.com' };
            return;
        }
        // --- LOCAL BYPASS END ---

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('[AUTH] FAILED: No Bearer token');
            reply.status(401).send({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'No authorization token provided'
                }
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.error('[AUTH] Token (first 20 chars):', token.substring(0, 20) + '...');

        // Create a temporary client for this request to verify the token
        console.error('[AUTH] Creating Supabase client with URL:', supabaseUrl?.substring(0, 30));
        const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        console.error('[AUTH] Calling supabase.auth.getUser()...');
        const { data: { user }, error } = await supabase.auth.getUser();
        console.error('[AUTH] getUser result - user:', user?.id, 'error:', error?.message);

        if (error || !user) {
            console.error('[AUTH] FAILED: Token verification error:', JSON.stringify(error));
            reply.status(401).send({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: error?.message || 'Invalid or expired token'
                }
            });
            return;
        }

        console.error('[AUTH] SUCCESS: User authenticated:', user.id);

        // Ensure user exists in our local DB (fixes foreign key errors on project creation)
        try {
            const { ensureUser } = await import('../services/userService.js');
            await ensureUser(user.id, user.email!, user.user_metadata?.full_name);
        } catch (dbError) {
            console.error('[AUTH] Warning: Failed to sync user to local DB:', dbError);
            // We continue anyway, but project creation might fail later
        }

        // Attach user info to request
        request.userId = user.id;
        request.user = user;

    } catch (error: any) {
        console.error('Auth middleware error:', error);
        reply.status(500).send({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Internal authentication error'
            }
        });
    }
}

/**
 * Decorator to make routes require authentication
 * Usage: server.addHook('preHandler', requireAuth)
 */
export const requireAuth = verifySupabaseToken;
