"use client";

import { Activity, CheckCircle2, Info, Sparkles, Wrench } from "lucide-react";
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
}

export function HealingPanel({ events, onRescan, isRescanning }: HealingPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] border-l border-[var(--border-default)] w-[300px]">
      <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent-primary)]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">Intelligence</h2>
        </div>
        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold">Active</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    <Sparkles size={12} className="text-emerald-500" />
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
                  <CheckCircle2 size={10} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-default)]">
        <button 
          onClick={onRescan}
          disabled={isRescanning}
          className="w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] rounded transition-all border border-white/5 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isRescanning && <Loader2 size={12} className="animate-spin" />}
          {isRescanning ? "Engine Working..." : "Rescan Engine"}
        </button>
      </div>
    </div>
  );
}
