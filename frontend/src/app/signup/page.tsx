'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { ShiftLogo } from '@/components/brand/ShiftLogo';
import { PageTransition } from '@/components/ui/PageTransition';
import Link from 'next/link';
import { Eye, EyeOff, Github } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error: signUpError } = await authService.signUp(email, password, fullName);

            if (signUpError) {
                setError(signUpError.message);
                setLoading(false);
            } else if (data.user) {
                // Check if email confirmation is required
                if (data.user.identities && data.user.identities.length === 0) {
                    // Email confirmation required
                    setSuccess(true);
                    setLoading(false);
                } else {
                    // No email confirmation needed or already confirmed
                    router.push('/onboarding/connect');
                    router.refresh();
                }
            }
        } catch (err: any) {
            console.error('[AUTH ERROR] handleSubmit:', err);
            setError(err.message || 'An unexpected error occurred');
            setLoading(false);
        }
    };

    const handleGithubLogin = async () => {
        setLoading(true);
        setError('');
        console.log('[AUTH] Initiating GitHub login...');
        
        try {
            const { error: githubError } = await authService.signInWithGithub();
            if (githubError) {
                console.error('[AUTH ERROR] signInWithGithub:', githubError);
                setError(githubError.message);
                setLoading(false);
            }
        } catch (err: any) {
            console.error('[AUTH ERROR] handleGithubLogin exception:', err);
            setError(err.message || 'Failed to start GitHub login');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <PageTransition>
                <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        <div className="bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-default)] rounded-2xl shadow-2xl p-8 text-center">
                            <div className="mb-4">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                                Check your email!
                            </h2>
                            <p className="text-[var(--text-secondary)] mb-4">
                                We've sent you a confirmation link. Click it to verify your email and access your dashboard.
                            </p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                                Don't see the email? Check your spam folder.
                            </p>
                        </div>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-[var(--bg-root)] flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <ShiftLogo size={40} />
                        <span className="text-2xl font-medium text-[var(--text-primary)]">Shift AI</span>
                    </div>

                    {/* Signup Form */}
                    <div className="bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-default)] rounded-2xl shadow-2xl p-8">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                            Create your account
                        </h1>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGithubLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[var(--bg-root)] border border-[var(--border-default)] hover:border-[var(--border-highlight)] text-[var(--text-primary)] font-medium rounded-lg transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Github size={20} />
                            Continue with GitHub
                        </button>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[var(--border-subtle)]"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[var(--bg-panel)] text-[var(--text-tertiary)]">Or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[var(--bg-root)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[var(--bg-root)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 bg-[var(--bg-root)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                                    Must be at least 6 characters
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent-glow)]"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Already have an account?{' '}
                                <Link href="/login" className="text-[var(--accent-primary)] hover:underline font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-xs text-[var(--text-tertiary)]">
                        Protected by Supabase Auth
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
