"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Mail, ArrowRight, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // TODO: Connect to backend auth
        setTimeout(() => {
            setLoading(false);
            setSent(true);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-white">
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <span className="text-2xl font-medium text-[var(--text-primary)]">Loom AI</span>
                </div>

                {/* Reset Card */}
                <div className="glass-panel rounded-2xl p-8">
                    {!sent ? (
                        <>
                            <div className="mb-6">
                                <h1 className="text-2xl font-medium text-[var(--text-primary)] mb-2">Reset your password</h1>
                                <p className="text-[14px] text-[var(--text-secondary)]">
                                    Enter your email and we'll send you a link to reset your password
                                </p>
                            </div>

                            <form onSubmit={handleReset} className="space-y-4">
                                {/* Email */}
                                <div>
                                    <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] pl-10 pr-4 py-2.5 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-3 text-[14px] font-medium text-white shadow-[0_0_20px_var(--accent-glow)] hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    {loading ? "Sending..." : "Send reset link"}
                                    {!loading && <ArrowRight size={16} />}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                                <Mail size={32} className="text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-medium text-[var(--text-primary)] mb-2">Check your email</h2>
                            <p className="text-[14px] text-[var(--text-secondary)] mb-6">
                                We've sent a password reset link to<br />
                                <span className="font-medium text-[var(--text-primary)]">{email}</span>
                            </p>
                            <p className="text-[13px] text-[var(--text-tertiary)] mb-6">
                                Didn't receive the email? Check your spam folder or{" "}
                                <button
                                    onClick={() => setSent(false)}
                                    className="text-[var(--accent-primary)] hover:underline"
                                >
                                    try again
                                </button>
                            </p>
                        </div>
                    )}

                    {/* Back to Login */}
                    <div className="mt-6">
                        <Link
                            href="/login"
                            className="flex items-center justify-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Back to login
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-[12px] text-[var(--text-tertiary)]">
                    <p>
                        Need help?{" "}
                        <a href="#" className="hover:text-[var(--text-secondary)] transition-colors">Contact support</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
