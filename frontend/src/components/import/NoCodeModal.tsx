"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Sparkles, Link2, Globe, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface NoCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, toolType: string) => void;
}

const TOOLS = [
    { id: 'lovable', name: 'Lovable', domain: 'lovable.dev', color: '#7c3aed' },
    { id: 'bubble', name: 'Bubble', domain: 'bubble.io', color: '#00d5ff' },
    { id: 'framer', name: 'Framer', domain: 'framer.com', color: '#0055ff' },
    { id: 'v0', name: 'v0', domain: 'v0.dev', color: '#000000' }
];

export function NoCodeModal({ isOpen, onClose, onSelect }: NoCodeModalProps) {
    const [url, setUrl] = useState("");
    const [selectedToolId, setSelectedToolId] = useState("lovable");
    const [error, setError] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSubmit = async () => {
        if (!url) {
            setError("Please enter a project URL");
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        // Basic URL validation
        const selectedTool = TOOLS.find(t => t.id === selectedToolId);
        if (selectedTool && !url.includes(selectedTool.domain) && !url.includes('localhost') && !url.startsWith('/')) {
            // If it doesn't match the selected tool domain, we warn but allow if it looks like a URL
            if (!url.startsWith('http')) {
                setError(`Please enter a valid URL (usually from ${selectedTool.domain})`);
                setIsAnalyzing(false);
                return;
            }
        }

        try {
            // For now, we just pass it to the analysis page
            // The backend LovableAdapter will handle the actual scraping/bridge
            onSelect(url, selectedToolId);
        } catch (err: any) {
            setError(err.message || "Failed to process URL");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#141414] border border-[#2C2C2C] text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles size={20} className="text-[var(--accent-primary)]" />
                        Direct No-Code Import
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        {/* Tool Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#666] uppercase tracking-wider">Source Tool</label>
                            <div className="grid grid-cols-4 gap-2">
                                {TOOLS.map((tool) => (
                                    <button
                                        key={tool.id}
                                        onClick={() => setSelectedToolId(tool.id)}
                                        className={clsx(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1 group",
                                            selectedToolId === tool.id 
                                                ? "bg-[var(--bg-panel)] border-[var(--accent-primary)] text-white shadow-[0_0_15px_rgba(0,245,255,0.05)]" 
                                                : "bg-[#1C1C1C] border-[#333] text-[#888] hover:border-[#444]"
                                        )}
                                    >
                                        <div 
                                            className="w-2 h-2 rounded-full mb-1" 
                                            style={{ backgroundColor: tool.color }}
                                        />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">{tool.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* URL Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#666] uppercase tracking-wider">Project or Preview URL</label>
                            <div className="relative">
                                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                                <input
                                    type="text"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    placeholder={`https://your-project.${TOOLS.find(t => t.id === selectedToolId)?.domain || 'dev'}`}
                                    className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]/50 transition-colors"
                                />
                            </div>
                            <p className="text-[11px] text-[#555]">
                                Shift AI will analyze the live DOM and styles to reconstruct the architecture.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center gap-2 text-red-500 text-xs">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!url || isAnalyzing}
                            className="px-8 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent-glow)]"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Bridging...
                                </>
                            ) : (
                                <>
                                    Initialize Direct Import
                                </>
                            )}
                        </button>
                    </div>

                    <div className="pt-4 border-t border-[#222]">
                        <div className="flex items-center gap-2 text-[#444]">
                            <CheckCircle2 size={12} />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Neural Bridge Active</span>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
