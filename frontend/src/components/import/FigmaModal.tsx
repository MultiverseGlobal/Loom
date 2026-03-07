"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Figma, Link2, Key, Loader2, AlertCircle } from "lucide-react";

interface FigmaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (fileUrl: string, token: string) => void;
}

export function FigmaModal({ isOpen, onClose, onSelect }: FigmaModalProps) {
    const [fileUrl, setFileUrl] = useState("");
    const [token, setToken] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const handleNext = async () => {
        if (!fileUrl || !token) return;

        setIsValidating(true);
        setError(null);

        // Basic URL validation
        if (!fileUrl.includes('figma.com/file/') && !fileUrl.includes('figma.com/design/')) {
            setError("Please enter a valid Figma file URL");
            setIsValidating(false);
            return;
        }

        try {
            const { fetchAPI } = await import("@/utils/api");
            const data = await fetchAPI<any>('/figma/analyze', {
                method: 'POST',
                body: JSON.stringify({ fileUrl, token })
            });

            onSelect(fileUrl, token);
        } catch (err: any) {
            setError(err.message || "Connection failed. Is the backend running?");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#141414] border border-[#2C2C2C] text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Figma size={20} className="text-[#F24E1E]" />
                        Import from Figma
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#666] uppercase tracking-wider">Figma File URL</label>
                            <div className="relative">
                                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                                <input
                                    type="text"
                                    value={fileUrl}
                                    onChange={e => setFileUrl(e.target.value)}
                                    placeholder="https://www.figma.com/file/..."
                                    className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F24E1E]/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#666] uppercase tracking-wider">Personal Access Token</label>
                            <div className="relative">
                                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                                <input
                                    type="password"
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    placeholder="figd_xxxxxxxxxxxx"
                                    className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F24E1E]/50 transition-colors"
                                />
                            </div>
                            <p className="text-[11px] text-[#555]">
                                Create a token in Figma Settings {'>'} Personal access tokens.
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
                            onClick={handleNext}
                            disabled={!fileUrl || !token || isValidating}
                            className="px-6 py-2 bg-[#F24E1E] hover:bg-[#ff5e30] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isValidating ? <Loader2 size={16} className="animate-spin" /> : "Analyze File"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
