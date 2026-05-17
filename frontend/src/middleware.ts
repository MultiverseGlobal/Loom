import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 1. Fast Cookie Pre-flight Check
    // If there is no Supabase auth cookie, we know for certain the user is not authenticated.
    // This avoids slow external network requests to Supabase Auth servers for all guests and bots.
    const hasAuthCookie = request.cookies.getAll().some(cookie => 
        cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
    );

    const protectedPaths = ['/dashboard', '/analysis', '/export', '/import', '/settings', '/versions', '/onboarding'];
    const isProtectedPath = protectedPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    );
    const isAuthPath = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';

    // Fast-path: Immediate redirect or pass-through for guest/unauthenticated users
    if (!hasAuthCookie) {
        if (isProtectedPath) {
            const url = new URL('/login', request.url);
            url.searchParams.set('next', request.nextUrl.pathname);
            return NextResponse.redirect(url);
        }
        return response;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({ request: { headers: request.headers } });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({ request: { headers: request.headers } });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    let user = null;
    try {
        // Race the auth check against a 2.5-second timeout
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise<{ data: { user: null } }>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase Auth response timeout')), 2500)
        );

        const { data } = await Promise.race([getUserPromise, timeoutPromise]);
        user = data?.user;
    } catch (err) {
        console.error('Middleware auth check timed out or failed:', err);
        // On network failure or timeout, allow request to pass through to let page level handle it, 
        // OR redirect to login if it's protected and we can't verify auth
        if (isProtectedPath) {
            const url = new URL('/login', request.url);
            url.searchParams.set('next', request.nextUrl.pathname);
            return NextResponse.redirect(url);
        }
    }

    // Protected routes - require authentication
    if (isProtectedPath && !user) {
        const url = new URL('/login', request.url);
        url.searchParams.set('next', request.nextUrl.pathname);
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (user && isAuthPath) {
        return NextResponse.redirect(new URL('/import', request.url));
    }

    return response;
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/analysis/:path*',
        '/export/:path*',
        '/import/:path*',
        '/settings/:path*',
        '/versions/:path*',
        '/onboarding/:path*',
        '/login',
        '/signup'
    ],
};

