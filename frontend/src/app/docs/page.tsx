"use client";

import { LandingNav } from '@/components/landing/LandingNav';
import { BookOpen, Code, Zap, Github, Terminal, ChevronRight, Layers, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DocsPage() {
    const sections = [
        {
            title: "Getting Started",
            icon: BookOpen,
            links: [
                { name: "Quick Start Guide", href: "#quickstart" },
                { name: "Installation", href: "#installation" },
                { name: "First Project", href: "#first-project" },
            ],
        },
        {
            title: "Features",
            icon: Zap,
            links: [
                { name: "Import from Loveable", href: "#loveable" },
                { name: "Import from Figma", href: "#figma" },
                { name: "AI Analysis", href: "#analysis" },
                { name: "Export to GitHub", href: "#github" },
            ],
        },
        {
            title: "IDE Extensions",
            icon: Terminal,
            links: [
                { name: "VS Code Extension", href: "#vscode" },
                { name: "Cursor Extension", href: "#cursor" },
                { name: "API Keys", href: "#api-keys" },
            ],
        },
        {
            title: "API Reference",
            icon: Code,
            links: [
                { name: "Authentication", href: "#auth-api" },
                { name: "Import API", href: "#import-api" },
                { name: "Export API", href: "#export-api" },
                { name: "Webhooks", href: "#webhooks" },
            ],
        },
    ];

    return (
        <div className="min-h-screen">
            <LandingNav />

            <div className="pt-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Hero */}
                    <div className="py-16 border-b border-[var(--border-subtle)]">
                        <h1 className="text-[48px] font-bold text-[var(--text-primary)] mb-4">
                            Documentation
                        </h1>
                        <p className="text-[18px] text-[var(--text-secondary)] max-w-2xl">
                            Everything you need to know about using Shift AI to transform your projects from AI prototypes to production-ready code.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="py-8">
                        <input
                            type="text"
                            placeholder="Search documentation..."
                            className="w-full max-w-2xl px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] text-[14px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                        />
                    </div>

                    {/* Sections Grid */}
                    <div className="grid md:grid-cols-2 gap-6 py-12">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            return (
                                <div
                                    key={section.title}
                                    className="p-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] hover:border-[var(--border-highlight)] transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <Icon size={24} className="text-[var(--accent-primary)]" />
                                        <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">
                                            {section.title}
                                        </h2>
                                    </div>
                                    <ul className="space-y-2">
                                        {section.links.map((link) => (
                                            <li key={link.name}>
                                                <Link
                                                    href={link.href}
                                                    className="flex items-center justify-between text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 group"
                                                >
                                                    <span>{link.name}</span>
                                                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>

                    {/* Architecture Visual */}
                    <div className="py-12 border-b border-[var(--border-subtle)]">
                        <h2 className="text-[32px] font-bold text-[var(--text-primary)] mb-8">System Architecture</h2>
                        <div className="p-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] overflow-hidden relative">
                            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl mx-auto">
                                {/* Source */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                        <Sparkles className="text-purple-400" size={32} />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-[var(--text-primary)]">AI Builders</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Loveable, Figma</div>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-purple-500/20 via-[var(--accent-primary)]/50 to-blue-500/20 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-[var(--bg-root)] border border-[var(--border-default)] text-xs font-mono text-[var(--accent-primary)]">
                                        JSON / API
                                    </div>
                                </div>

                                {/* Core */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-[var(--accent-primary)]/10 flex items-center justify-center border border-[var(--accent-primary)]/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                        <Layers className="text-[var(--accent-primary)]" size={40} />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-[var(--text-primary)]">Shift Engine</div>
                                        <div className="text-xs text-[var(--text-secondary)]">Universal Project Graph</div>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex-1 h-[2px] bg-gradient-to-r from-[var(--accent-primary)]/50 to-blue-500/20 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-[var(--bg-root)] border border-[var(--border-default)] text-xs font-mono text-blue-400">
                                        AST / Gen
                                    </div>
                                </div>

                                {/* Target */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Github className="text-blue-400" size={32} />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-semibold text-[var(--text-primary)]">Production</div>
                                        <div className="text-xs text-[var(--text-secondary)]">GitHub, VS Code</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community & Support */}
                    <div className="grid md:grid-cols-2 gap-6 pt-12 pb-20">
                        <div className="p-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-all" />
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 relative z-10">Join the Community</h3>
                            <p className="text-[var(--text-secondary)] mb-6 relative z-10">
                                Connect with other developers, share projects, and get help from the community.
                            </p>
                            <Link href="/discord" className="inline-flex items-center text-[var(--accent-primary)] hover:underline font-medium relative z-10">
                                Join Discord <ChevronRight size={16} />
                            </Link>
                        </div>
                        <div className="p-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-all" />
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 relative z-10">Enterprise Support</h3>
                            <p className="text-[var(--text-secondary)] mb-6 relative z-10">
                                Need dedicated support for your team? Contact our sales team for custom solutions.
                            </p>
                            <Link href="/contact" className="inline-flex items-center text-[var(--accent-primary)] hover:underline font-medium relative z-10">
                                Contact Sales <ChevronRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
