"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { GitCommit, Clock, ArrowRight, Loader2, FileCode } from "lucide-react";

export default function VersionsPage() {
    const [deltas, setDeltas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDeltas = async () => {
            try {
                // Fetch all deltas (for MVP, showing global history or mock project context)
                const { fetchAPI } = await import("@/utils/api");
                const data = await fetchAPI<any[]>('/deltas');
                setDeltas(data);
            } catch (e) {
                console.error("Failed to load deltas", e);
            } finally {
                setLoading(false);
            }
        };
        loadDeltas();
    }, []);

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto p-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">Version History</h1>
                    <p className="text-[var(--text-secondary)]">Track every change made by Shift AI and sync status.</p>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center text-[var(--text-tertiary)]">
                        <Loader2 className="animate-spin" />
                    </div>
                ) : deltas.length === 0 ? (
                    <div className="text-center py-20 rounded-xl border border-dashed border-[var(--border-default)] text-[var(--text-tertiary)]">
                        No history found. Make some changes to your project!
                    </div>
                ) : (
                    <div className="relative border-l border-[var(--border-default)] ml-4 space-y-8 pl-8">
                        {deltas.map((delta, i) => (
                            <div key={delta.id} className="relative group">
                                <span className="absolute -left-[39px] top-1 w-5 h-5 rounded-full bg-[var(--bg-root)] border-2 border-[var(--accent-primary)] z-10" />

                                <div className="p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] hover:border-[var(--border-highlight)] transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                                                {delta.id.slice(0, 7)}
                                            </span>
                                            <h3 className="text-[15px] font-medium text-[var(--text-primary)]">
                                                {delta.title || "Code Update"}
                                            </h3>
                                        </div>
                                        <span className="text-[12px] text-[var(--text-tertiary)] flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(delta.created_at).toLocaleString()}
                                        </span>
                                    </div>

                                    <p className="text-[14px] text-[var(--text-secondary)] mb-4">
                                        {delta.description || "Automated refactoring and improvements applied to codebase."}
                                    </p>

                                    {delta.payload && (
                                        <div className="bg-[var(--bg-root)] rounded-lg p-3 font-mono text-[12px] text-[var(--text-secondary)] flex items-center gap-2 border border-[var(--border-subtle)]">
                                            <FileCode size={14} />
                                            {Object.keys(delta.payload).length} files modified
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
