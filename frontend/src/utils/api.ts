import { createClient } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

export async function fetchAPI<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    // Ensure endpoint starts with /api/ if it doesn't already
    const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const fullUrl = `${API_URL}${path}`;

    // Ensure options is an object
    const fetchOptions = options || {};

    try {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[API] Fetching: ${fullUrl}`);
            if (fetchOptions.body) {
                console.log('[API] Request Body:', fetchOptions.body);
            }
        }

        // Get Supabase session token
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        // Construct headers safely using Headers API
        const headers = new Headers(fetchOptions.headers);
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        if (session?.access_token) {
            headers.set('Authorization', `Bearer ${session.access_token}`);
        }

        const response = await fetch(fullUrl, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            let errorMessage = `Request failed with status ${response.status}`;

            try {
                const errorData = await response.json();
                console.error('Backend error response:', errorData);

                // Check multiple possible error field names
                if (errorData.error) {
                    errorMessage = errorData.error;
                    if (errorData.details) {
                        errorMessage += ` (${typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details)})`;
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (Object.keys(errorData).length === 0) {
                    // Empty object response
                    errorMessage = `${errorMessage} (No error details provided)`;
                } else {
                    // Some other structure, stringify it
                    errorMessage = JSON.stringify(errorData);
                }
            } catch {
                // Response body isn't JSON
                if (response.statusText) {
                    errorMessage = `${errorMessage}: ${response.statusText}`;
                }
            }

            console.error('Final error message:', errorMessage);
            throw new Error(errorMessage);
        }

        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // No content (e.g., 204 No Content)
        // Cast via unknown to satisfy strict constraints
        return null as unknown as T;

    } catch (error) {
        console.error('❌ [FETCH] Error:', error);

        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error(
                `Cannot connect to backend at ${fullUrl}. ` +
                `Please ensure the backend server is running and accessible.`
            );
        }

        // Re-throw Error objects as-is
        if (error instanceof Error) {
            throw error;
        }
        // Wrap unexpected errors
        throw new Error('An unexpected error occurred');
    }
}
