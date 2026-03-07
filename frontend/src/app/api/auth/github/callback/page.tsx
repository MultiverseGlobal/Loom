"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function GitHubCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState("Connecting to GitHub...");
    const calledRef = useRef(false);

    useEffect(() => {
        const exchangeCode = async () => {
            if (calledRef.current) return;
            calledRef.current = true;

            const code = searchParams.get("code");
            const state = searchParams.get("state");

            if (!code) {
                setStatus('error');
                setMessage("No authorization code found.");
                return;
            }

            try {
                const { fetchAPI } = await import("@/utils/api");
                const data = await fetchAPI<any>('/github/callback', {
                    method: 'POST',
                    body: JSON.stringify({ code, state })
                });

                setStatus('success');
                setMessage(`Successfully connected as ${data.github_user}!`);
                router.push('/dashboard?auth_success=true');
            } catch (error: any) {
                console.error("Callback error:", error);
                setStatus('error');
                setMessage(error.message || "An unexpected error occurred.");
            }
        };

        exchangeCode();
    }, [searchParams, router]);

    return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="p-8 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] max-w-md w-full text-center">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin" />
                            <h1 className="text-xl font-medium text-[var(--text-primary)]">Connecting GitHub</h1>
                            <p className="text-[var(--text-secondary)]">{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            <h1 className="text-xl font-medium text-[var(--text-primary)]">Connected!</h1>
                            <p className="text-[var(--text-secondary)]">{message}</p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">Redirecting to dashboard...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-4">
                            <AlertCircle className="w-12 h-12 text-rose-500" />
                            <h1 className="text-xl font-medium text-[var(--text-primary)]">Connection Failed</h1>
                            <p className="text-[var(--text-secondary)]">{message}</p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="mt-4 px-6 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
