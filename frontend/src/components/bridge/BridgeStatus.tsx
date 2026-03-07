"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ArrowRightLeft, Zap } from "lucide-react";

interface BridgeStats {
    supportedPlatforms: {
        source: string[];
        target: string[];
    };
}

export function BridgeStatus() {
    const [stats, setStats] = useState<BridgeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'active' | 'idle'>('idle');

    useEffect(() => {
        fetchStats();
        // Simulate checking sync status
        const interval = setInterval(() => {
            setStatus(prev => prev === 'idle' ? 'active' : 'idle');
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/bridge/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch bridge stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-panel p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft size={16} className="text-[var(--accent-primary)]" />
                    <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                        Bridge Status
                    </h3>
                </div>
                <div className="text-[12px] text-[var(--text-secondary)]">
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-4 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ArrowRightLeft size={16} className="text-[var(--accent-primary)]" />
                    <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                        Bridge Status
                    </h3>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${status === 'active'
                            ? 'bg-green-500 animate-pulse'
                            : 'bg-[var(--text-tertiary)]'
                        }`} />
                    <span className="text-[11px] text-[var(--text-secondary)] capitalize">
                        {status}
                    </span>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="space-y-3">
                    {/* Source Platforms */}
                    <div>
                        <div className="text-[11px] text-[var(--text-tertiary)] mb-1.5">
                            Source Adapters
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.supportedPlatforms.source.map(platform => (
                                <div
                                    key={platform}
                                    className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] capitalize"
                                >
                                    {platform}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Target Platforms */}
                    <div>
                        <div className="text-[11px] text-[var(--text-tertiary)] mb-1.5">
                            Target Adapters
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.supportedPlatforms.target.map(platform => (
                                <div
                                    key={platform}
                                    className="px-2 py-1 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] capitalize"
                                >
                                    {platform}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sync Engine Info */}
                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                            <Zap size={12} className="text-[var(--accent-primary)]" />
                            <span>Universal Project Graph v1.0.0</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
