"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Github, Lock, Search, FolderGit2, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";

interface Repo {
    id: number;
    full_name: string;
    description: string;
    updated_at: string;
    private: boolean;
    language: string;
}

interface RepositoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (repo: Repo, token: string) => void;
}

export function RepositoryModal({ isOpen, onClose, onSelect }: RepositoryModalProps) {
    const [step, setStep] = useState<"token" | "select">("token");
    const [token, setToken] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [repos, setRepos] = useState<Repo[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [search, setSearch] = useState("");
    const [isUsingOAuth, setIsUsingOAuth] = useState(false);

    const checkExistingAuth = async () => {
        setIsLoadingRepos(true);
        setError(null);
        try {
            const { githubService } = await import("@/services/github.service");
            const repos = await githubService.getRepositories();

            if (repos && repos.length > 0) {
                setIsUsingOAuth(true);
                setRepos(repos as any);
                setStep("select");
            }
        } catch (err: any) {
            console.error("[RepositoryModal] Auth check failed:", err);

            // Check if it's a connection error
            if (err.message?.includes("GitHub account not connected") || err.message?.includes("GITHUB_NOT_CONNECTED")) {
                setError("GitHub account not connected. Please connect via GitHub above.");
            } else if (err.message?.includes("Not authenticated")) {
                setError("Please log in to your account first.");
            } else {
                // Other errors - just stay on token screen
                console.log("Assuming no GitHub connection, showing OAuth option");
            }
        } finally {
            setIsLoadingRepos(false);
        }
    };

    const handleOAuthConnect = async () => {
        try {
            const { githubService } = await import("@/services/github.service");
            const url = await githubService.getAuthorizeUrl();
            window.location.href = url;
        } catch (err: any) {
            console.error("Failed to get OAuth URL:", err);
            setError(err.message || "Failed to connect to GitHub");
        }
    };

    useEffect(() => {
        if (isOpen) {
            checkExistingAuth();
        }
    }, [isOpen]);

    const handleValidate = async () => {
        if (!token) return;
        setIsValidating(true);
        setError(null);

        try {
            // This is for PAT (Personal Access Token) fallback
            const { fetchAPI } = await import("@/utils/api");
            const data = await fetchAPI<{ success: boolean }>('/github/connect', {
                method: 'POST',
                body: JSON.stringify({ access_token: token, github_user_id: "manual" }) // Connect accepts access_token
            });

            if (data.success) { // Connect returns success: true
                setStep("select");
                fetchRepos();
            } else {
                setError("Invalid token. Please check permissions.");
            }
        } catch (err) {
            setError("Failed to validate token.");
        } finally {
            setIsValidating(false);
        }
    };

    const fetchRepos = async () => {
        setIsLoadingRepos(true);
        try {
            const { githubService } = await import("@/services/github.service");
            const data = await githubService.getRepositories();
            setRepos(data as any);
        } catch (err) {
            console.error("Failed to fetch repos", err);
            setError("Failed to fetch repositories");
        } finally {
            setIsLoadingRepos(false);
        }
    };

    const filteredRepos = repos.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#141414] border border-[#2C2C2C] text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Github size={20} />
                        Import from GitHub
                    </DialogTitle>
                </DialogHeader>

                {step === "token" && (
                    <div className="space-y-4 py-4">
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Github size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-white">Direct Integration</h4>
                                <p className="text-xs text-[#888] mt-1">
                                    The easiest way to import. Connect your account to see all your repositories.
                                </p>
                            </div>
                            {error && (
                                <div className="w-full p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-left">
                                    <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-amber-300">{error}</p>
                                </div>
                            )}
                            <button
                                onClick={handleOAuthConnect}
                                className="w-full h-10 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                            >
                                <Github size={16} />
                                Connect via GitHub
                            </button>
                        </div>

                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px bg-[#222] flex-1" />
                            <span className="text-[10px] text-[#444] font-bold uppercase tracking-widest">or use access token</span>
                            <div className="h-px bg-[#222] flex-1" />
                        </div>

                        <p className="text-sm text-[#888]">
                            Enter a Personal Access Token (PAT) with <code>repo</code> scope to access your repositories manually.
                        </p>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[#666]">PERSONAL ACCESS TOKEN</label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                                <input
                                    type="password"
                                    value={token}
                                    onChange={e => setToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxx"
                                    className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-xs">
                                    <AlertCircle size={12} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={onClose} className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleValidate}
                                disabled={!token || isValidating}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                {isValidating ? <Loader2 size={16} className="animate-spin" /> : "Next"}
                            </button>
                        </div>
                    </div>
                )}

                {step === "select" && (
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search repositories..."
                                className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>

                        <div className="h-[300px] overflow-y-auto border border-[#222] rounded-lg">
                            {isLoadingRepos ? (
                                <div className="flex items-center justify-center h-full text-[#666] gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Loading repositories...
                                </div>
                            ) : filteredRepos.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-[#444]">
                                    No repositories found.
                                </div>
                            ) : (
                                <div className="divide-y divide-[#222]">
                                    {filteredRepos.map(repo => (
                                        <button
                                            key={repo.id}
                                            onClick={() => onSelect(repo, token)}
                                            className="w-full text-left p-3 hover:bg-[#1f1f1f] transition-colors flex items-start gap-3 group"
                                        >
                                            <div className="mt-1 text-[#666] group-hover:text-emerald-500 transition-colors">
                                                <FolderGit2 size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-white group-hover:text-emerald-400">
                                                        {repo.full_name}
                                                    </span>
                                                    {repo.private && (
                                                        <span className="text-[10px] bg-[#333] text-[#aaa] px-1.5 py-0.5 rounded border border-[#444]">
                                                            Private
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#666] line-clamp-1 mt-0.5">
                                                    {repo.description || "No description"}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#555]">
                                                    {repo.language && (
                                                        <span className="flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                                            {repo.language}
                                                        </span>
                                                    )}
                                                    <span>Updated {formatDistanceToNow(new Date(repo.updated_at))} ago</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
