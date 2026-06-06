"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Upload, ArrowRight, Code2, Figma, Github, Sparkles, FileArchive, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { RepositoryModal } from "@/components/import/RepositoryModal";
import { FigmaModal } from "@/components/import/FigmaModal";
import { PromptModal } from "@/components/import/PromptModal";
import { NoCodeModal } from "@/components/import/NoCodeModal";
import { WebflowIngestModal } from "@/components/import/WebflowIngestModal";

export default function ImportPage() {
    const router = useRouter();

    const sources = [
        {
            id: "webflow",
            name: "Webflow Export",
            icon: FileArchive,
            badge: "ZIP Upload",
            badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            accentColor: "group-hover:text-blue-400",
            description: "Upload a Webflow ZIP export.",
            detail: "We'll parse your Webflow HTML, CSS, and assets — converting them into clean, maintainable React components with Tailwind."
        },
        {
            id: "nocode",
            name: "AI Builder / No-Code",
            icon: Sparkles,
            badge: "Live URL",
            badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
            accentColor: "group-hover:text-violet-400",
            description: "Import from Lovable, Bubble, Framer, or v0.",
            detail: "Connect a live preview URL. We extract the DOM, infer component boundaries, and reconstruct the full architecture."
        },
        {
            id: "figma",
            name: "Figma Design",
            icon: Figma,
            badge: "Design → Code",
            badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
            accentColor: "group-hover:text-pink-400",
            description: "Import directly from Figma.",
            detail: "We map Auto-Layout to Tailwind, identify reusable symbols, and generate typed component props from your design tokens."
        },
        {
            id: "github",
            name: "GitHub Repository",
            icon: Github,
            badge: "Existing Code",
            badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            accentColor: "group-hover:text-emerald-400",
            description: "Import and refactor an existing repo.",
            detail: "We analyze dependencies, map the component graph, and prepare your codebase for IDE-native migration and AI healing."
        },
        {
            id: "prompt",
            name: "Start from a Prompt",
            icon: Code2,
            badge: "AI Scaffold",
            badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
            accentColor: "group-hover:text-amber-400",
            description: "Describe your idea, we'll build the structure.",
            detail: "Describe your app in plain language. Shift AI generates the architecture, file tree, and component scaffolding — ready to ship."
        },
    ];

    const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
    const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [isNoCodeModalOpen, setIsNoCodeModalOpen] = useState(false);
    const [isWebflowModalOpen, setIsWebflowModalOpen] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        setSelectedSourceId(id);

        if (id === 'github') {
            setIsRepoModalOpen(true);
        } else if (id === 'nocode') {
            setIsNoCodeModalOpen(true);
        } else if (id === 'figma') {
            setIsFigmaModalOpen(true);
        } else if (id === 'prompt') {
            setIsPromptModalOpen(true);
        } else if (id === 'webflow') {
            setIsWebflowModalOpen(true);
        }
    };

    const handleRepoSelect = (repo: any, token: string) => {
        setIsRepoModalOpen(false);
        sessionStorage.setItem('gh_token', token);

        const params = new URLSearchParams({
            source: 'github',
            repo: repo.full_name,
            branch: 'main',
            toolType: 'general'
        });

        router.push(`/analysis?${params.toString()}`);
    };

    const handleNoCodeSelect = (url: string, toolType: string) => {
        setIsNoCodeModalOpen(false);
        
        const params = new URLSearchParams({
            source: 'nocode',
            url: url,
            toolType: toolType
        });

        router.push(`/analysis?${params.toString()}`);
    };

    const handleFigmaSelect = (url: string, token: string) => {
        setIsFigmaModalOpen(false);
        sessionStorage.setItem('figma_token', token);

        const params = new URLSearchParams({
            source: 'figma',
            url: url
        });
        router.push(`/analysis?${params.toString()}`);
    };

    const handlePromptSelect = (prompt: string) => {
        setIsPromptModalOpen(false);
        sessionStorage.setItem('app_prompt', prompt);

        const params = new URLSearchParams({
            source: 'prompt',
            hasPrompt: 'true'
        });
        router.push(`/analysis?${params.toString()}`);
    };

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto p-8 pt-16">

                {/* Header */}
                <div className="mb-12 animate-fadeIn">
                    <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-[var(--accent-primary)] mb-3">
                        New Project
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-3">
                        Where is your project coming from?
                    </h1>
                    <p className="text-[var(--text-secondary)] text-[15px] max-w-xl">
                        Shift AI extracts structure, not just files. Choose a source and we'll map everything into a clean, IDE-ready codebase.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sources.map((source, idx) => (
                        <button
                            key={source.id}
                            onClick={() => handleSelect(source.id)}
                            className={clsx(
                                "group relative p-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] text-left",
                                "hover:border-[var(--border-highlight)] hover:bg-[var(--bg-hover)]",
                                "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20",
                                // Make Webflow card span full width on medium, or featured styling
                                source.id === "webflow" && "md:col-span-2 xl:col-span-1"
                            )}
                            style={{ animationDelay: `${idx * 80}ms` }}
                        >
                            {/* Badge */}
                            <div className="flex items-center justify-between mb-5">
                                <div className={clsx(
                                    "flex items-center justify-center w-11 h-11 rounded-xl border",
                                    "bg-[var(--bg-subtle)] border-[var(--border-subtle)]",
                                    "text-[var(--text-tertiary)] group-hover:border-[var(--border-default)] transition-colors",
                                    source.accentColor
                                )}>
                                    <source.icon size={22} />
                                </div>
                                <span className={clsx(
                                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                                    source.badgeColor
                                )}>
                                    {source.badge}
                                </span>
                            </div>

                            <h3 className={clsx(
                                "text-[15px] font-semibold text-[var(--text-primary)] mb-2 transition-colors",
                                source.accentColor
                            )}>
                                {source.name}
                            </h3>

                            <p className="text-[13px] text-[var(--text-secondary)] mb-4 font-medium">
                                {source.description}
                            </p>

                            <div className="pt-4 border-t border-[var(--border-subtle)]">
                                <p className="text-[12px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors leading-relaxed">
                                    {source.detail}
                                </p>
                            </div>

                            {/* Hover Arrow */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 text-[var(--text-secondary)]">
                                <ArrowRight size={18} />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer hint */}
                <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-10">
                    All imports run through the Shift AI Neural Bridge — your code never leaves your environment.
                </p>

                <RepositoryModal
                    isOpen={isRepoModalOpen}
                    onClose={() => setIsRepoModalOpen(false)}
                    onSelect={handleRepoSelect}
                />

                <FigmaModal
                    isOpen={isFigmaModalOpen}
                    onClose={() => setIsFigmaModalOpen(false)}
                    onSelect={handleFigmaSelect}
                />

                <PromptModal
                    isOpen={isPromptModalOpen}
                    onClose={() => setIsPromptModalOpen(false)}
                    onSelect={handlePromptSelect}
                />

                <NoCodeModal
                    isOpen={isNoCodeModalOpen}
                    onClose={() => setIsNoCodeModalOpen(false)}
                    onSelect={handleNoCodeSelect}
                />

                {isWebflowModalOpen && (
                    <WebflowIngestModal
                        isOpen={isWebflowModalOpen}
                        onClose={() => setIsWebflowModalOpen(false)}
                    />
                )}
            </div>
        </AppLayout>
    );
}
