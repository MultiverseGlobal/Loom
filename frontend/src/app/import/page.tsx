"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Upload, Link2, Key, CheckCircle2, ArrowRight, Terminal, Laptop, Loader2, Code2, Figma, FileJson, Sparkles, Github } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { RepositoryModal } from "@/components/import/RepositoryModal";
import { FigmaModal } from "@/components/import/FigmaModal";
import { PromptModal } from "@/components/import/PromptModal";

export default function ImportPage() {
    const router = useRouter();

    const sources = [
        {
            id: "nocode",
            name: "AI Builder / No-Code",
            icon: Sparkles,
            description: "Import from Loveable, Bubble, or Framer.",
            detail: "We'll extract layout structure and convert to clean React components."
        },
        {
            id: "figma",
            name: "Design File",
            icon: Figma,
            description: "Import from Figma.",
            detail: "We'll map Auto-Layout to Tailwind and identify reusable symbols."
        },
        {
            id: "github",
            name: "Existing Repository",
            icon: Github,
            description: "Import from GitHub.",
            detail: "We'll analyze dependencies, map the graph, and prepare it for your IDE."
        },
        {
            id: "prompt",
            name: "New Idea",
            icon: Code2,
            description: "Start from scratch.",
            detail: "Describe your app. We'll scaffold the perfect architecture and file tree."
        },
    ];

    const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
    const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        setSelectedSourceId(id);

        if (id === 'github' || id === 'nocode') {
            setIsRepoModalOpen(true);
        } else if (id === 'figma') {
            setIsFigmaModalOpen(true);
        } else if (id === 'prompt') {
            setIsPromptModalOpen(true);
        }
    };

    const handleRepoSelect = (repo: any, token: string) => {
        setIsRepoModalOpen(false);
        sessionStorage.setItem('gh_token', token);

        const params = new URLSearchParams({
            source: selectedSourceId || 'github',
            repo: repo.full_name,
            branch: 'main' // Default
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
            <div className="max-w-4xl mx-auto p-8 pt-20">

                {/* Header Phase 3 */}
                <div className="text-center mb-16 animate-fadeIn">
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-3">Where is your project coming from?</h1>
                    <p className="text-[var(--text-secondary)] text-[16px]">
                        Shift AI extracts structure, not just files. Select a source to begin analysis.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sources.map((source, idx) => (
                        <button
                            key={source.id}
                            onClick={() => handleSelect(source.id)}
                            className="group relative p-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] text-left hover:border-[var(--border-highlight)] hover:bg-[var(--bg-hover)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className="w-12 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mb-6 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:border-[var(--border-default)] transition-colors">
                                <source.icon size={24} />
                            </div>

                            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
                                {source.name}
                            </h3>

                            <p className="text-[14px] text-[var(--text-secondary)] mb-4">
                                {source.description}
                            </p>

                            <div className="pt-4 border-t border-[var(--border-subtle)]">
                                <p className="text-[12px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors leading-relaxed">
                                    {source.detail}
                                </p>
                            </div>

                            {/* Hover Arrow */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 text-[var(--text-secondary)]">
                                <ArrowRight size={20} />
                            </div>
                        </button>
                    ))}
                </div>

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
            </div>
        </AppLayout>
    );
}
