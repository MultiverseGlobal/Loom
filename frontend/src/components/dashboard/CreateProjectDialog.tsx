"use client";

import { useState, useEffect } from "react";
import { projectService } from "@/services/project.service";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateProjectDialog({ isOpen, onClose, onSuccess }: CreateProjectDialogProps) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [framework, setFramework] = useState("nextjs");
    const [sourceType, setSourceType] = useState<"blank" | "github" | "lovable" | "webflow">("blank");
    const [githubUrl, setGithubUrl] = useState("");
    const [webflowFile, setWebflowFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // GitHub State
    const [isGitHubAuthenticated, setIsGitHubAuthenticated] = useState(false);
    const [repositories, setRepositories] = useState<import('@/services/github.service').GitHubRepo[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        if (sourceType === 'github') {
            checkGitHubAuth();
        }
    }, [sourceType]);

    const checkGitHubAuth = async () => {
        setIsLoadingRepos(true);
        try {
            const { githubService } = await import('@/services/github.service');
            const repos = await githubService.getRepositories();
            setRepositories(repos);
            setIsGitHubAuthenticated(true);
        } catch (err) {
            console.error(err);
            setIsGitHubAuthenticated(false);
        } finally {
            setIsLoadingRepos(false);
        }
    };

    const handleGitHubConnect = async () => {
        setIsConnecting(true);
        setError("");
        try {
            const { githubService } = await import('@/services/github.service');
            const url = await githubService.getAuthorizeUrl();
            window.location.href = url;
        } catch (err: any) {
            console.error("Failed to get OAuth URL:", err);
            setError(err.message || "Failed to connect to GitHub");
            toast.error(err.message || "Failed to connect to GitHub");
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const project = await projectService.createProject({
                name,
                framework,
                platform: sourceType === 'lovable' ? 'loveable' : (sourceType === 'webflow' ? 'webflow' : 'komposo'),
                source_url: githubUrl || undefined
            });

            // If it's a GitHub link, we might need extra steps on the backend
            if (sourceType === 'github' && githubUrl) {
                const ownerRepo = githubUrl.replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
                const [owner, repo] = ownerRepo.split('/');

                if (owner && repo) {
                    const repoBase = repo.replace(/\.git$/, '');

                    const { fetchAPI } = await import('@/utils/api');
                    await fetchAPI('/github/bind', {
                        method: 'POST',
                        body: JSON.stringify({
                            project_id: project.id,
                            owner,
                            repo: repoBase
                        })
                    });
                }
            }

            // Handle Webflow ZIP upload
            if (sourceType === 'webflow' && webflowFile) {
                const formData = new FormData();
                formData.append('file', webflowFile);

                const { fetchAPI } = await import('@/utils/api');
                try {
                    toast.loading(`Uploading constraints for ${name}...`, { id: 'upload' });
                    await fetchAPI(`/projects/${project.id}/upload-webflow`, {
                        method: 'POST',
                        body: formData,
                        // Don't set Content-Type header so browser sets it correctly with boundary
                        headers: {} 
                    });
                    toast.success("Webflow ZIP uploaded successfully!", { id: 'upload' });
                } catch (err: any) {
                    toast.error(`Failed to upload Webflow ZIP: ${err.message}`, { id: 'upload' });
                    // We don't throw here, so the project creation still succeeds
                }
            }

            toast.success(`Project "${name}" created successfully!`);
            onSuccess();
            onClose();

            // Redirect to the new project
            router.push(`/projects/${project.id}`);

            setName("");
            setGithubUrl("");
            setSourceType("blank");
        } catch (err: any) {
            console.error("Create Project Error:", err);
            toast.error(err.message || "Failed to create project");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md transform overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-2xl transition-all animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
                    <h2 className="text-[14px] font-medium text-[var(--text-primary)]">Create New Project</h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Project Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                            placeholder="e.g. My Awesome App"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">source</label>
                        <div className="flex bg-[var(--bg-root)] p-1 rounded-md border border-[var(--border-default)]">
                            <button
                                type="button"
                                onClick={() => setSourceType("blank")}
                                className={`flex-1 text-[13px] font-medium py-1.5 rounded-sm transition-all ${sourceType === "blank" ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                            >
                                New Blank Project
                            </button>
                            <button
                                type="button"
                                onClick={() => setSourceType("github")}
                                className={`flex-1 text-[13px] font-medium py-1.5 rounded-sm transition-all ${sourceType === "github" ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                            >
                                GitHub
                            </button>
                            <button
                                type="button"
                                onClick={() => setSourceType("lovable")}
                                className={`flex-1 text-[13px] font-medium py-1.5 rounded-sm transition-all ${sourceType === "lovable" ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                            >
                                Lovable
                            </button>
                            <button
                                type="button"
                                onClick={() => setSourceType("webflow")}
                                className={`flex-1 text-[13px] font-medium py-1.5 rounded-sm transition-all ${sourceType === "webflow" ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                            >
                                Webflow
                            </button>
                        </div>
                    </div>

                    {sourceType === "github" ? (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            {!isGitHubAuthenticated ? (
                                <div className="text-center p-4 border border-dashed border-[var(--border-default)] rounded-md bg-[var(--bg-subtle)]">
                                    <p className="text-[13px] text-[var(--text-secondary)] mb-3">Connect your GitHub account to access your repositories.</p>
                                    
                                    {error && (
                                        <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-[12px] text-red-500 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-red-500" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleGitHubConnect}
                                        disabled={isConnecting}
                                        className="inline-flex items-center gap-2 rounded-md bg-[#24292F] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#24292F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isConnecting ? (
                                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-r-white animate-spin" />
                                        ) : (
                                            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                                        )}
                                        {isConnecting ? "Connecting..." : "Connect GitHub"}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Repository</label>
                                    {isLoadingRepos ? (
                                        <div className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)] py-2">
                                            <div className="w-4 h-4 rounded-full border-2 border-[var(--text-tertiary)] border-r-transparent animate-spin" />
                                            Fetching repositories...
                                        </div>
                                    ) : (
                                        <select
                                            value={githubUrl}
                                            onChange={(e) => {
                                                setGithubUrl(e.target.value);
                                                // Auto-fill name if empty
                                                if (!name) {
                                                    const repo = repositories.find(r => r.html_url === e.target.value);
                                                    if (repo) setName(repo.name);
                                                }
                                            }}
                                            className="w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                                        >
                                            <option value="">Select a repository...</option>
                                            {repositories.map((repo) => (
                                                <option key={repo.id} value={repo.html_url}>
                                                    {repo.full_name} {repo.private ? '(Private)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                                        Select the repository you want to import.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : sourceType === "lovable" ? (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Lovable Project URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={githubUrl} // Reusing githubUrl state for source URL for MVP
                                    onChange={(e) => setGithubUrl(e.target.value)}
                                    className="flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                                    placeholder="https://lovable.dev/project/..."
                                    required
                                />
                            </div>
                            <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                                We will attempt to sync the project structure from Lovable.
                            </p>
                        </div>
                    ) : sourceType === "webflow" ? (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Upload Webflow ZIP</label>
                            <div className="relative border-2 border-dashed border-[var(--border-default)] rounded-xl p-6 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-all group group-hover:cursor-pointer flex flex-col items-center justify-center text-center">
                                <input 
                                    type="file" 
                                    accept=".zip"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setWebflowFile(e.target.files[0]);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <div className="p-3 bg-[var(--bg-root)] border border-[var(--border-subtle)] rounded-full mb-3 group-hover:scale-110 shadow-sm transition-transform">
                                    <svg className="w-6 h-6 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 4V20M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M4 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                                    {webflowFile ? webflowFile.name : "Click to browse or drag ZIP here"}
                                </h3>
                                <p className="text-xs text-[var(--text-tertiary)] max-w-[200px]">
                                    {webflowFile ? `${(webflowFile.size / 1024 / 1024).toFixed(2)} MB` : "Export your Webflow project as a .zip file."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">Framework</label>
                            <div className="relative">
                                <select
                                    value={framework}
                                    onChange={(e) => setFramework(e.target.value)}
                                    className="w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
                                >
                                    <option value="nextjs">Next.js</option>
                                    <option value="react">React</option>
                                    <option value="fastapi">FastAPI</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-tertiary)]">
                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            {loading ? "Creating..." : (sourceType === "blank" ? "Create Project" : "Import Project")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
