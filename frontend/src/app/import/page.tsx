"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowRight, Github, FileArchive } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { RepositoryModal } from "@/components/import/RepositoryModal";
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
            id: "github",
            name: "GitHub Repository",
            icon: Github,
            badge: "Existing Code",
            badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            accentColor: "group-hover:text-emerald-400",
            description: "Import and refactor an existing repo.",
            detail: "We analyze dependencies, map the component graph, and prepare your codebase for IDE-native migration and AI healing."
        },
    ];

    const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
    const [isWebflowModalOpen, setIsWebflowModalOpen] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        setSelectedSourceId(id);
        if (id === 'github') {
            setIsRepoModalOpen(true);
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
