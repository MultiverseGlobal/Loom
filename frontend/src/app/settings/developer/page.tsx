"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Shield, Terminal } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
    id: string;
    name: string;
    created_at: string;
    last_used_at: string | null;
    prefix?: string;
}

export default function DeveloperSettingsPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [justCopied, setJustCopied] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            const { fetchAPI } = await import("@/utils/api");
            const data = await fetchAPI<any>('/keys');
            setKeys(data.keys || []);
        } catch (err) {
            console.error("Failed to fetch keys", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { fetchAPI } = await import("@/utils/api");
            const data = await fetchAPI<any>('/keys', {
                method: 'POST',
                body: JSON.stringify({ name: newKeyName || "New API Key" })
            });

            if (data.key) {
                setGeneratedKey(data.key);
                setNewKeyName("");
                fetchKeys(); // Refresh list
            }
        } catch (err) {
            console.error("Failed to create key", err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;

        try {
            const { fetchAPI } = await import("@/utils/api");
            await fetchAPI(`/keys/${id}`, {
                method: 'DELETE'
            });
            setKeys(prev => prev.filter(k => k.id !== id));
        } catch (err) {
            console.error("Failed to revoke key", err);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 2000);
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto p-8 pt-12 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Developer Settings</h1>
                    <p className="text-[#888] text-sm">Convert your existing projects or build for the Loom platform.</p>
                </div>

                {/* API Keys Section */}
                <div className="bg-[#141414] border border-[#2C2C2C] rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-[#2C2C2C] flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-medium text-white flex items-center gap-2">
                                <Key size={18} className="text-emerald-500" />
                                API Keys
                            </h2>
                            <p className="text-[#666] text-xs mt-1">Manage access tokens for CLI and IDE extensions.</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">

                        {/* New Key Form */}
                        {!generatedKey && (
                            <form onSubmit={handleCreateKey} className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Terminal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                                    <input
                                        type="text"
                                        placeholder="Key Name (e.g. VS Code Laptop)"
                                        value={newKeyName}
                                        onChange={e => setNewKeyName(e.target.value)}
                                        className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isCreating ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Plus size={16} />}
                                    Generate
                                </button>
                            </form>
                        )}

                        {/* Generated Key Display */}
                        {generatedKey && (
                            <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-lg animate-fadeIn">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-emerald-500">
                                        <Shield size={20} />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <h3 className="text-sm font-medium text-emerald-400">New Secret Key Generated</h3>
                                            <p className="text-xs text-emerald-300/70 mt-1">
                                                Please copy this key immediately. We won't show it again.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-black/30 border border-emerald-900/50 rounded px-3 py-2 text-sm font-mono text-emerald-200 break-all">
                                                {generatedKey}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(generatedKey)}
                                                className="p-2 hover:bg-emerald-900/30 rounded text-emerald-400 transition-colors"
                                            >
                                                {justCopied ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setGeneratedKey(null)}
                                            className="text-xs text-[#666] hover:text-[#888] underline decoration-dotted"
                                        >
                                            I've saved it, close this
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Keys List */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-medium text-[#666] uppercase tracking-wider">Active Keys</h3>

                            {isLoading ? (
                                <div className="text-sm text-[#444] animate-pulse">Loading keys...</div>
                            ) : keys.length === 0 ? (
                                <div className="text-sm text-[#444] italic">No active API keys found.</div>
                            ) : (
                                <div className="space-y-2">
                                    {keys.map(key => (
                                        <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] group hover:border-[#3a3a3a] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-[#222] flex items-center justify-center text-[#666]">
                                                    <Terminal size={14} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-white">{key.name}</div>
                                                    <div className="text-xs text-[#555] flex gap-2">
                                                        <span>Created {formatDistanceToNow(new Date(key.created_at))} ago</span>
                                                        <span>•</span>
                                                        <span className="font-mono">...{key.id.slice(-4)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-xs text-[#444]">
                                                    {key.last_used_at ? `Last used ${formatDistanceToNow(new Date(key.last_used_at))} ago` : 'Never used'}
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeKey(key.id)}
                                                    className="p-2 text-[#444] hover:text-red-400 hover:bg-red-950/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Revoke Key"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Danger Zone */}
                <div className="border border-red-900/30 rounded-xl overflow-hidden bg-red-950/5 p-6 flex items-start gap-4">
                    <AlertTriangle className="text-red-500 shrink-0" size={20} />
                    <div>
                        <h3 className="text-sm font-medium text-red-200">Danger Zone</h3>
                        <p className="text-xs text-red-200/60 mt-1 mb-4">
                            Revoking keys will immediately disconnect any connected IDEs or CI/CD pipelines using them.
                        </p>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
