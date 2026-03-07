"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { HatchLogo } from "@/components/brand/HatchLogo";
import { Terminal, Laptop, CheckCircle2, AlertCircle } from "lucide-react";

function ConnectPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pairingToken = searchParams.get('token'); // The pairing_id from the extension

    const [loading, setLoading] = useState(true); // Loading session details
    const [authorizing, setAuthorizing] = useState(false); // Processing click
    const [session, setSession] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (pairingToken) {
            fetchSessionDetails(pairingToken);
        } else {
            setLoading(false);
        }
    }, [pairingToken]);

    const fetchSessionDetails = async (id: string) => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('pairing_sessions')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error("Session not found");
            if (data.status !== 'pending') throw new Error(`Session is ${data.status}`);

            setSession(data);
        } catch (err: any) {
            console.error("Fetch session error:", err);
            setError(err.message || "Invalid or expired pairing request");
        } finally {
            setLoading(false);
        }
    };

    const handleAuthorize = async () => {
        if (!session) return;
        setAuthorizing(true);
        try {
            const res = await fetch('/api/extensions/device-flow/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pairing_id: session.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Authorization failed');

            setSuccess(true);

            // Proactively try to open VS Code
            setTimeout(() => {
                window.location.href = `vscode://LoomAI.loom-dev-bridge/connect?pairing_id=${session.id}`;
            }, 500);

            setTimeout(() => {
                router.push('/dashboard');
            }, 5000); // 5s to allow link to trigger

        } catch (err: any) {
            setError(err.message);
        } finally {
            setAuthorizing(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Connected Successfully!</h1>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Your IDE is now paired with Hatch. You can close this tab and return to VS Code.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-active)] rounded-lg text-sm text-[var(--text-primary)] transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-root)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent-primary)]/5 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="flex items-center justify-center gap-3 mb-10">
                    <HatchLogo size={48} />
                    <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Hatch</span>
                </div>

                <div className="bg-[var(--bg-panel)]/80 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-8">
                    {loading ? (
                        <div className="py-12 text-center">
                            <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-[var(--text-secondary)]">Verifying request...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={24} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">Connection Failed</h3>
                            <p className="text-red-400 text-sm mb-6">{error}</p>
                            <button onClick={() => router.push('/dashboard')} className="text-[var(--text-secondary)] hover:text-white underline text-sm">Return to Dashboard</button>
                        </div>
                    ) : pairingToken && session ? (
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-white mb-6">Connect Development Environment</h2>
                            <div className="bg-[var(--bg-root)] border border-[var(--border-subtle)] rounded-xl p-4 mb-8 flex items-center gap-4 text-left">
                                <div className="w-10 h-10 bg-[var(--bg-panel)] rounded-lg flex items-center justify-center border border-[var(--border-default)]">
                                    <Terminal size={20} className="text-[var(--text-secondary)]" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">
                                        {session.machine_info?.hostname || 'Unknown Device'}
                                    </div>
                                    <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-2">
                                        <span>{session.machine_info?.os || 'System'}</span>
                                        <span>•</span>
                                        <span>VS Code {session.machine_info?.version}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm mb-8">
                                By connecting, this IDE will have access to your Hatch projects and AI configuration.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleAuthorize}
                                    disabled={authorizing}
                                    className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black font-semibold rounded-lg transition-all shadow-lg hover:shadow-[var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {authorizing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                            <span>Connecting...</span>
                                        </>
                                    ) : (
                                        "Connect Workspace"
                                    )}
                                </button>
                                <button
                                    onClick={() => setError("Request rejected by user")}
                                    className="w-full py-3 bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-[var(--bg-root)] rounded-full flex items-center justify-center mx-auto mb-6 border border-[var(--border-subtle)]">
                                <Laptop size={32} className="text-[var(--text-secondary)]" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-4">Connect from VS Code</h2>
                            <p className="text-[var(--text-secondary)] text-sm mb-8">
                                Open the <strong>Hatch</strong> extension in VS Code and click <strong>"Connect Workspace"</strong> to start the pairing process.
                            </p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-6 py-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-active)] rounded-lg text-sm text-[var(--text-primary)] transition-colors"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}
                </div>
                <div className="mt-8 text-center">
                    <button className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                        Having trouble connecting?
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ConnectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <ConnectPageContent />
        </Suspense>
    );
}
