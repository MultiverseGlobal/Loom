"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { Search, Download, Check, ExternalLink, Box, Loader2 } from "lucide-react";

export default function ExtensionsPage() {
    const [extensions, setExtensions] = useState<any[]>([]);
    const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadExtensions = async () => {
        try {
            const { fetchAPI } = await import("@/utils/api");
            const [allData, installedData] = await Promise.all([
                fetchAPI<any>('/extensions'),
                fetchAPI<any>('/extensions/installed')
            ]);

            setExtensions(allData.extensions || []);
            setInstalledIds(new Set(installedData.extensions.map((e: any) => e.id)));
        } catch (e) {
            console.error("Failed to load extensions", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExtensions();
    }, []);

    const toggleInstall = async (ext: any) => {
        setProcessingId(ext.id);
        const isInstalled = installedIds.has(ext.id);
        const method = isInstalled ? 'DELETE' : 'POST';

        try {
            const { fetchAPI } = await import("@/utils/api");
            await fetchAPI(`/extensions/${ext.id}/install`, {
                method
            });
            const newSet = new Set(installedIds);
            if (isInstalled) newSet.delete(ext.id);
            else newSet.add(ext.id);
            setInstalledIds(newSet);
        } catch (e) {
            console.error("Action failed", e);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto p-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">Extensions</h1>
                    <p className="text-[var(--text-secondary)]">Supercharge your workflow with community plugins and official integrations.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search extensions..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] transition-colors"
                    />
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center text-[var(--text-tertiary)]">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {extensions.map((ext) => {
                            const isInstalled = installedIds.has(ext.id);
                            return (
                                <div key={ext.id} className="p-6 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] flex flex-col hover:border-[var(--border-highlight)] transition-colors group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center">
                                            <Box size={24} className="text-[var(--text-secondary)]" />
                                        </div>
                                        {ext.is_official && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                                OFFICIAL
                                            </span>
                                        )}
                                    </div>

                                    <div className="mb-4 flex-1">
                                        <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">{ext.name}</h3>
                                        <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2">{ext.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)] mt-auto">
                                        <span className="text-[12px] text-[var(--text-tertiary)]">v{ext.version} • {ext.author}</span>
                                        <button
                                            onClick={() => toggleInstall(ext)}
                                            disabled={processingId === ext.id}
                                            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${isInstalled
                                                ? "bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500"
                                                : "bg-[var(--text-primary)] text-[var(--bg-root)] hover:opacity-90"
                                                }`}
                                        >
                                            {processingId === ext.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : isInstalled ? (
                                                <>Installed</>
                                            ) : (
                                                <>Install</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
