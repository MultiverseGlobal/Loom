"use client";

import { LandingNav } from '@/components/landing/LandingNav';
import Link from 'next/link';
import { ArrowRight, Zap, Code, Github, Terminal, CheckCircle2, Sparkles, FileCode, Layers, Info } from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';
import { motion } from 'framer-motion';
import { FeatureCarousel } from "@/components/landing/FeatureCarousel";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-root)] overflow-hidden">
            <LandingNav />

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--accent-primary)]/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <PageTransition>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6">
                    <div className="max-w-6xl mx-auto text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-panel)] border border-[var(--border-default)] text-[12px] text-[var(--text-secondary)] mb-8 shadow-sm"
                        >
                            <Sparkles size={14} className="text-[var(--accent-primary)]" />
                            <span className="font-medium">From prototype to codebase</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-[64px] font-bold text-[var(--text-primary)] leading-[1.1] mb-8 tracking-tight"
                        >
                            Turn no-code exports<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-blue-500">
                                into real projects
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-[20px] text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed"
                        >
                            When you outgrow visual builders like Webflow, Bubble, or Glide, Hatch helps you migrate your project to an IDE cleanly — with developer-ready code you can actually maintain.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex items-center justify-center gap-4 mb-20"
                        >
                            {/* Fixed: Link wrapping Button issue. Used Link with button styles. */}
                            <Link
                                href="/signup"
                                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--accent-primary)] text-white font-medium transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:-translate-y-1"
                            >
                                Get Started
                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </Link>

                            <Link
                                href="#how-it-works"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-hover)] transition-all hover:-translate-y-1"
                            >
                                See how it works
                            </Link>
                        </motion.div>

                        {/* Hero Visual aka "Code Preview" */}
                        <motion.div
                            initial={{ opacity: 0, y: 40, rotateX: 10 }}
                            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative max-w-4xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-2xl overflow-hidden"
                            style={{ perspective: "1000px" }}
                        >
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
                                </div>
                                <div className="ml-4 flex items-center gap-2 px-3 py-1 rounded bg-[var(--bg-root)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] font-mono">
                                    <Terminal size={10} />
                                    <span>hatch-cli.ts</span>
                                </div>
                            </div>
                            <div className="p-8 font-mono text-[13px] text-left overflow-hidden">
                                <div className="space-y-1">
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">1</span>
                                        <span className="text-blue-400">import</span> <span className="text-[var(--text-primary)]">{`{ Migration }`}</span> <span className="text-blue-400">from</span> <span className="text-green-400">'@hatch/engine'</span>;
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">2</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">3</span>
                                        <span className="text-purple-400">const</span> <span className="text-yellow-400">initHatch</span> <span className="text-[var(--text-primary)]">=</span> <span className="text-purple-400">async</span> () <span className="text-purple-400">={'>'}</span> {`{`}
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">4</span>
                                        <span className="pl-4 text-[var(--text-secondary)]">// analyzing project structure...</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">5</span>
                                        <span className="pl-4 text-purple-400">const</span> <span className="text-[var(--text-primary)]">graph</span> <span className="text-[var(--text-primary)]">=</span> <span className="text-purple-400">await</span> <span className="text-[var(--text-primary)]">Project.analyze(</span><span className="text-green-400">'./src'</span><span className="text-[var(--text-primary)]">);</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">6</span>
                                        <span className="pl-4 text-purple-400">return</span> <span className="text-[var(--text-primary)]">graph.optimize();</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-[var(--text-tertiary)] w-6 text-right select-none">7</span>
                                        {`}`}
                                    </div>
                                </div>
                                <div className="mt-6 p-4 rounded bg-[var(--bg-root)] border border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-2 text-[var(--accent-primary)] mb-2">
                                        <CheckCircle2 size={14} />
                                        <span className="font-semibold">Optimization Complete</span>
                                    </div>
                                    <div className="space-y-1 text-[var(--text-secondary)]">
                                        <div className="flex justify-between">
                                            <span>Start Time:</span>
                                            <span>34ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Files Processed:</span>
                                            <span>142</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>GitHub Repo:</span>
                                            <span className="text-blue-400 underline decoration-blue-400/30">hatch-engine/migration-demo</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="py-24 px-6 bg-[var(--bg-subtle)]/50 border-y border-[var(--border-subtle)]">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-[36px] font-bold text-[var(--text-primary)] mb-4">How it works</h2>
                            <p className="text-[18px] text-[var(--text-secondary)] max-w-2xl mx-auto">
                                We clean this up so you don&apos;t have to.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="p-8 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-14 w-14 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] mb-6">
                                    <FileCode size={28} />
                                </div>
                                <h3 className="text-[20px] font-semibold text-[var(--text-primary)] mb-3">1. Connect Source</h3>
                                <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                                    Upload your Webflow ZIP, connect Bubble API, or link your Glide data. We parse it instantly.
                                </p>
                            </div>

                            <div className="p-8 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-14 w-14 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 mb-6">
                                    <Sparkles size={28} />
                                </div>
                                <h3 className="text-[20px] font-semibold text-[var(--text-primary)] mb-3">2. Smart Analysis</h3>
                                <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                                    Our engine refactors spaghetti code, fixes imports, creates components, and ensures best practices.
                                </p>
                            </div>

                            <div className="p-8 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6">
                                    <Github size={28} />
                                </div>
                                <h3 className="text-[20px] font-semibold text-[var(--text-primary)] mb-3">3. Ship to IDE</h3>
                                <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                                    Get a production-ready GitHub repository. Clone it to VS Code with our extension in one click.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Carousel */}
                <section className="py-20 bg-[var(--bg-root)] overflow-hidden">
                    <div className="max-w-6xl mx-auto px-6 mb-12 flex items-end justify-between">
                        <div>
                            <p className="text-[14px] font-medium text-[var(--accent-primary)] uppercase tracking-wider mb-2">
                                Powerful Features
                            </p>
                            <h2 className="text-[32px] font-bold text-[var(--text-primary)]">
                                Everything you need
                            </h2>
                        </div>
                        <Link href="/signup" className="hidden md:flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium">
                            Explore all features <ArrowRight size={14} />
                        </Link>
                    </div>
                    <FeatureCarousel />
                </section>

                {/* Footer */}
                <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 pt-20 pb-12 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-16">
                            <div className="col-span-2">
                                <Link href="/" className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                                        <Zap size={18} className="text-[var(--accent-primary)]" />
                                    </div>
                                    <span className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">Hatch</span>
                                </Link>
                                <p className="text-[14px] text-[var(--text-secondary)] mb-6 max-w-xs">
                                    Bridging the gap between visual builders and real engineering environments.
                                </p>
                                <div className="flex gap-4">
                                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                                        <Github size={20} />
                                    </a>
                                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                                    </a>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4">Product</h4>
                                <ul className="space-y-3 text-[14px] text-[var(--text-secondary)]">
                                    <li><Link href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</Link></li>
                                    <li><Link href="/pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</Link></li>
                                    <li><Link href="/extensions" className="hover:text-[var(--text-primary)] transition-colors">Extensions</Link></li>
                                    <li><Link href="/changelog" className="hover:text-[var(--text-primary)] transition-colors">Changelog</Link></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4">Resources</h4>
                                <ul className="space-y-3 text-[14px] text-[var(--text-secondary)]">
                                    <li><Link href="/docs" className="hover:text-[var(--text-primary)] transition-colors">Documentation</Link></li>
                                    <li><Link href="/docs#api" className="hover:text-[var(--text-primary)] transition-colors">API Reference</Link></li>
                                    <li><Link href="https://github.com" className="hover:text-[var(--text-primary)] transition-colors">Community</Link></li>
                                    <li><Link href="/help" className="hover:text-[var(--text-primary)] transition-colors">Help Center</Link></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4">Company</h4>
                                <ul className="space-y-3 text-[14px] text-[var(--text-secondary)]">
                                    <li><Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">About</Link></li>
                                    <li><Link href="/blog" className="hover:text-[var(--text-primary)] transition-colors">Blog</Link></li>
                                    <li><Link href="/careers" className="hover:text-[var(--text-primary)] transition-colors">Careers</Link></li>
                                    <li><Link href="/contact" className="hover:text-[var(--text-primary)] transition-colors">Contact</Link></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-[var(--text-primary)] mb-4">Legal</h4>
                                <ul className="space-y-3 text-[14px] text-[var(--text-secondary)]">
                                    <li><Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link></li>
                                    <li><Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link></li>
                                    <li><Link href="/security" className="hover:text-[var(--text-primary)] transition-colors">Security</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-[var(--text-tertiary)]">
                            <div>© 2026 Hatch Inc. All rights reserved.</div>
                            <div className="flex items-center gap-6">
                                <span>Made by developers for developers</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </PageTransition>
        </div>
    );
}
