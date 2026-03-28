"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Sparkles, Loader2, Sparkle } from "lucide-react";

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (prompt: string) => void;
}

export function PromptModal({ isOpen, onClose, onSelect }: PromptModalProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        // Simulate initial AI processing
        setTimeout(() => {
            setIsGenerating(false);
            onSelect(prompt);
        }, 1200);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#141414] border border-[#2C2C2C] text-white max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Sparkles size={20} className="text-[var(--accent-primary)]" />
                        Start from a Prompt
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4 font-sans">
                    <div className="space-y-3">
                        <p className="text-sm text-[#888] leading-relaxed">
                            Describe the application you want to build. Shift AI will scaffold the architecture, file tree, and core components for you.
                        </p>
                        <div className="relative">
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="e.g., A real-time dashboard for a delivery service with a tracking map and driver analytics..."
                                className="w-full h-40 bg-[#1C1C1C] border border-[#333] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[var(--accent-primary)]/50 transition-all resize-none leading-relaxed shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
                            />
                            <div className="absolute bottom-3 right-3 text-[10px] text-[#444] font-mono font-bold">
                                {prompt.length} / 1000
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#888] hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={!prompt.trim() || isGenerating}
                            className="px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[var(--accent-glow)]"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Conceptualizing...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkle size={16} fill="currentColor" />
                                    <span>Scaffold App</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
