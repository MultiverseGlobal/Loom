"use client";

import { useEffect, useState, useRef } from "react";
import { socketService } from "@/services/socket";
import { Terminal, Terminal as TerminalIcon, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface LogLine {
    id: string;
    message: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'process';
}

export function LiveTerminal() {
    const [logs, setLogs] = useState<LogLine[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = socketService.subscribe((event) => {
            if (event.type === 'analysis:status') {
                const { message, step, timestamp } = event.payload;
                
                const newLog: LogLine = {
                    id: Math.random().toString(36).substr(2, 9),
                    message,
                    timestamp: timestamp || new Date().toISOString(),
                    type: step === 'complete' ? 'success' : (step === 'error' ? 'error' : 'process')
                };

                setLogs(prev => [...prev.slice(-19), newLog]); // Keep last 20 lines
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (logs.length === 0) return null;

    return (
        <div className="rounded-2xl bg-[#09090b] border border-[var(--border-default)] overflow-hidden shadow-2xl flex flex-col h-[280px]">
            {/* Terminal Header */}
            <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[#111114] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-[var(--accent-primary)]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">AI Analysis Log</span>
                </div>
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                </div>
            </div>

            {/* Scrollable Content */}
            <div 
                ref={scrollRef}
                className="flex-1 p-4 font-mono text-[12px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-[var(--border-subtle)]"
            >
                <AnimatePresence mode="popLayout">
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-start gap-2 leading-relaxed"
                        >
                            <span className="text-[var(--text-tertiary)] mt-0.5 shrink-0 select-none">
                                [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                            </span>
                            <ChevronRight size={14} className="mt-0.5 shrink-0 text-[var(--accent-primary)] opacity-50" />
                            <span className={clsx(
                                "break-all",
                                log.type === 'success' && "text-emerald-400 font-bold",
                                log.type === 'error' && "text-red-400",
                                log.type === 'process' && "text-[var(--text-primary)]"
                            )}>
                                {log.message}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {/* Typing Indicator */}
            <div className="px-4 py-2 bg-[#111114]/50 border-t border-[var(--border-subtle)] flex items-center gap-2">
                <div className="flex gap-1">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 rounded-full bg-[var(--accent-primary)]" />
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)] italic">Processing Neural Blueprint...</span>
            </div>
        </div>
    );
}
