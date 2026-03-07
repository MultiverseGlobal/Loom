"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { Loader2, Shield, CheckCircle, Smartphone, AlertTriangle } from "lucide-react";
import { authService } from "@/services/auth.service";
import clsx from "clsx";
import { createClient } from "@/lib/supabase";

export default function ConnectPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-root)]">
                <Loader2 className="animate-spin text-[var(--accent-primary)]" />
            </div>
        }>
            <ConnectContent />
        </Suspense>
    );
}

function ConnectContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get("session_id");

    const [status, setStatus] = useState<'loading' | 'confirm' | 'approving' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState("");
    const [user, setUser] = useState<any>(null);

    // 1. Check Auth & Params
    useEffect(() => {
        const check = async () => {
            if (!sessionId) {
                setStatus('error');
                setErrorMsg("Missing session ID. Please restart the connection from VS Code.");
                return;
            }

            const u = await authService.getUser();
            if (!u) {
                // Redirect to login, preserving the destination
                const nextUrl = encodeURIComponent(`/connect?session_id=${sessionId}`);
                router.push(`/login?next=${nextUrl}`);
                return;
            }

            setUser(u);
            setStatus('confirm');
        };
        check();
    }, [sessionId, router]);

    // 2. Approve Action
    const handleApprove = async () => {
        setStatus('approving');
        try {
            const { fetchAPI } = await import("@/utils/api");
            await fetchAPI('/connect/approve', {
                method: 'POST',
                body: JSON.stringify({ session_id: sessionId })
            });

            setStatus('success');
        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMsg(e.message);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--bg-root)]">
                <Loader2 className="animate-spin text-[var(--accent-primary)]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-root)] p-4">
            <div className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-xl shadow-2xl p-8 animate-fadeIn">

                {/* Header Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center">
                        <img src="/logo.svg" alt="Loom" className="w-8 h-8 opacity-80" onError={(e) => {
                            // Fallback if logo invalid
                            (e.target as any).style.display = 'none';
                            (e.target as any).parentNode.innerHTML = '<span class="text-2xl font-bold">L</span>';
                        }} />
                    </div>
                </div>

                {status === 'confirm' && (
                    <div className="text-center space-y-6">
                        <div>
                            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Connect VS Code?</h1>
                            <p className="text-[14px] text-[var(--text-secondary)]">
                                <span className="font-semibold text-[var(--text-primary)]">{user?.email}</span>
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-left flex items-start gap-3">
                            <Shield className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[13px] font-medium text-[var(--text-primary)]">Grant Access</p>
                                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                                    This extension will be able to read your projects and run commands on behalf of your account.
                                </p>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <button
                                onClick={handleApprove}
                                className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent-primary)]/20"
                            >
                                Authorize
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-2.5 rounded-lg bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-subtle)] transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {status === 'approving' && (
                    <div className="text-center py-8">
                        <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin mx-auto mb-4" />
                        <h2 className="text-lg font-medium text-[var(--text-primary)]">Connecting...</h2>
                        <p className="text-[var(--text-secondary)] text-sm">Please wait while we verify your session.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center py-4 space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Connected!</h2>
                            <p className="text-[14px] text-[var(--text-secondary)]">
                                Your VS Code extension is now ready to use. <br />
                                You can close this tab.
                            </p>
                        </div>
                        <button
                            onClick={() => window.close()} // Might not work in all browsers
                            className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm hover:text-[var(--text-primary)] transition-colors"
                        >
                            Close Tab
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Connection Failed</h2>
                            <p className="text-[13px] text-red-500 bg-red-500/5 p-3 rounded-lg">
                                {errorMsg}
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-[var(--text-secondary)] hover:underline text-sm"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
