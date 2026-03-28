import { useState } from "react";
import { Activity, CheckCircle2, Info, Loader2, Sparkles, Wrench, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HealingEvent {
    id: string;
    type: 'fix' | 'info' | 'optimization';
    message: string;
    detail: string;
    timestamp: Date;
}

interface HealingPanelProps {
    events: HealingEvent[];
    onRescan?: () => void;
    isRescanning?: boolean;
    onFix?: (event: HealingEvent) => Promise<void>;
}

export function HealingPanel({ events, onRescan, isRescanning, onFix }: HealingPanelProps) {
    const [fixingEventId, setFixingEventId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'intelligence' | 'props'>('intelligence');

    const handleFix = async (event: HealingEvent) => {
        if (!onFix) return;
        setFixingEventId(event.id);
        try {
            await onFix(event);
        } finally {
            setFixingEventId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-panel)] border-l border-[var(--border-default)] w-[300px] overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-[var(--border-default)] bg-[var(--bg-root)]">
                <button
                    onClick={() => setActiveTab('intelligence')}
                    className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'intelligence' ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/5' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                >
                    <Sparkles size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Intelligence</span>
                </button>
                <button
                    onClick={() => setActiveTab('props')}
                    className={`flex-1 py-3 px-2 flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'props' ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/5' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                >
                    <Settings2 size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Props</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'intelligence' ? (
                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 opacity-50">
                                <Activity size={24} className="text-[var(--text-tertiary)]" />
                                <p className="text-[10px] text-[var(--text-tertiary)] font-medium">Monitoring architectural drift...</p>
                            </div>
                        ) : (
                            <AnimatePresence initial={false}>
                                {events.map((event) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-3 rounded-lg bg-[var(--bg-root)] border border-[var(--border-subtle)] space-y-1.5 relative overflow-hidden group hover:border-[var(--accent-primary)]/30 transition-all shadow-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            {event.type === 'fix' ? (
                                                <Wrench size={12} className="text-amber-500" />
                                            ) : event.type === 'optimization' ? (
                                                <Sparkles size={12} className="text-[var(--accent-primary)]" />
                                            ) : (
                                                <Info size={12} className="text-blue-500" />
                                            )}
                                            <span className="text-[11px] font-semibold text-[var(--text-primary)]">{event.message}</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--text-secondary)] leading-tight">{event.detail}</p>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[9px] text-[var(--text-tertiary)] uppercase font-mono">
                                                {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>

                                            {event.type === 'fix' && onFix && (
                                                <button
                                                    onClick={() => handleFix(event)}
                                                    disabled={!!fixingEventId}
                                                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                                                >
                                                    {fixingEventId === event.id ? (
                                                        <Loader2 size={10} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={10} />
                                                    )}
                                                    {fixingEventId === event.id ? "Fixing..." : "Fix Issue"}
                                                </button>
                                            )}

                                            {event.type !== 'fix' && (
                                                <CheckCircle2 size={10} className="text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50 px-4">
                        <Settings2 size={32} className="text-[var(--text-tertiary)] mb-2" />
                        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">Property Inspector</h3>
                        <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
                            No component-level props detected in the current blueprint.
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-default)]">
                <button
                    onClick={onRescan}
                    disabled={isRescanning}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] rounded transition-all border border-white/5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isRescanning && <Loader2 size={12} className="animate-spin text-[var(--accent-primary)]" />}
                    {isRescanning ? "Engine Working..." : "Rescan Engine"}
                </button>
            </div>
        </div>
    );
}
