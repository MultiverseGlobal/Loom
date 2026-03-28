"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { MessageSquarePlus, ThumbsUp, Loader2 } from "lucide-react";

export default function SuggestFeaturePage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadRequests = async () => {
        try {
            const { fetchAPI } = await import("@/utils/api");
            const data = await fetchAPI<any>('/feedback');
            setRequests(data.requests || []);
        } catch (e) { /* ignore */ }
    };

    useEffect(() => { loadRequests(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description) return;
        setIsSubmitting(true);
        try {
            const { fetchAPI } = await import("@/utils/api");
            await fetchAPI('/feedback', {
                method: 'POST',
                body: JSON.stringify({ title, description })
            });
            setTitle("");
            setDescription("");
            loadRequests();
        } catch (e) { /* ignore */ } finally {
            setIsSubmitting(false);
        }
    };

    const handleVote = async (id: string) => {
        try {
            const { fetchAPI } = await import("@/utils/api");
            await fetchAPI(`/feedback/${id}/vote`, {
                method: 'POST'
            });
            loadRequests();
        } catch (e) { /* ignore */ }
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto p-8 grid md:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="md:col-span-1 space-y-6">
                        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2 tracking-tight">Suggest Feature</h1>
                        <p className="text-[11px] text-[var(--accent-primary)] font-bold uppercase tracking-[0.2em] opacity-80">Shape the future of Shift AI</p>

                    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)]">
                        <div>
                            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Title</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                                placeholder="E.g. Dark Mode"
                            />
                        </div>
                        <div>
                            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] min-h-[100px]"
                                placeholder="Explain your idea..."
                            />
                        </div>
                        <button
                            disabled={isSubmitting || !title}
                            className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-black text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_var(--accent-glow)]"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto text-black" /> : "Submit Request"}
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-[16px] font-medium text-[var(--text-primary)]">Community Requests</h2>

                    <div className="space-y-4">
                        {requests.length === 0 ? (
                            <div className="p-8 text-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-default)] rounded-xl">
                                No requests yet. Be the first!
                            </div>
                        ) : requests.map(req => (
                            <div key={req.id} className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] flex gap-4">
                                <button
                                    onClick={() => handleVote(req.id)}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] transition-colors h-fit min-w-[50px]"
                                >
                                    <ThumbsUp size={16} className="text-[var(--text-secondary)] mb-1" />
                                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{req.votes}</span>
                                </button>
                                <div>
                                    <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">{req.title}</h3>
                                    <p className="text-[13px] text-[var(--text-secondary)]">{req.description}</p>
                                    <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                                        {req.status === 'pending' ? 'Needs Review' : req.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
