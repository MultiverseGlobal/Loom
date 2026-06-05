"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { projectService, type Project } from "@/services/project.service";
import { UploadCloud, Github, Clipboard, FileCode, CheckCircle, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export default function IngestPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [sourceType, setSourceType] = useState<"clipboard" | "github" | "zip">("zip");
    const [content, setContent] = useState("");
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const router = useRouter();

    useEffect(() => {
        projectService.getProjects().then(setProjects).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId) {
            setStatus({ type: "error", message: "Please select a project" });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            if (sourceType === "zip" && zipFile) {
                const formData = new FormData();
                formData.append("file", zipFile);
                
                const analyzerUrl = process.env.NEXT_PUBLIC_ANALYZER_URL || "http://localhost:8000";
                const res = await fetch(`${analyzerUrl}/analyzer/ingest/webflow`, {
                    method: "POST",
                    body: formData,
                });
                
                if (!res.ok) throw new Error("Failed to parse zip");
                const data = await res.json();
                
                // Store blueprint keyed by project ID
                localStorage.setItem(`blueprint_${selectedProjectId}`, JSON.stringify(data.blueprint));
                
                setStatus({ type: "success", message: "Webflow project parsed! Redirecting to blueprint review..." });
                router.push(`/projects/${selectedProjectId}/blueprint`);
                return;
            }

            await projectService.ingestCode({
                projectId: selectedProjectId,
                sourceType,
                content: sourceType === "clipboard" ? content : undefined,
            });
            setStatus({ type: "success", message: "Ingestion job queued successfully" });
            setContent("");
        } catch (err) {
            setStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to process ingestion" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-medium text-[var(--text-primary)]">Import Project</h1>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-[11px] font-semibold uppercase tracking-wider">
                            Webflow → Next.js
                        </span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                        Upload your Webflow export ZIP. Our AI will parse the HTML structure, break it into React components, and generate a production-ready codebase.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Project Selection */}
                    <div className="space-y-2">
                        <label className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Target Project</label>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-panel)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all appearance-none"
                        >
                            <option value="">Select a project...</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Source Type Selection */}
                    <div className="space-y-3">
                        <label className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Source</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: "zip", label: "Webflow ZIP", icon: FileCode },
                                { id: "clipboard", label: "Paste Code", icon: Clipboard },
                                { id: "github", label: "GitHub", icon: Github },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setSourceType(type.id as any)}
                                    className={clsx(
                                        "flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-all",
                                        sourceType === type.id
                                            ? "border-[var(--accent-primary)] bg-[var(--accent-glow)]/10 text-[var(--text-primary)]"
                                            : "border-[var(--border-default)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:border-[var(--border-highlight)] hover:bg-[var(--bg-hover)]"
                                    )}
                                >
                                    <type.icon size={20} />
                                    <span className="text-[13px] font-medium">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Content Input */}
                    <div className="space-y-2">
                        <label className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                            {sourceType === "clipboard" ? "Paste Code" : sourceType === "github" ? "Repository URL" : "File Upload"}
                        </label>

                        {sourceType === "clipboard" && (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={8}
                                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all resize-none"
                                placeholder="// Paste your code here..."
                            />
                        )}

                        {sourceType === "github" && (
                            <input
                                type="text"
                                disabled
                                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-root)] px-3 py-2 text-[13px] text-[var(--text-secondary)] cursor-not-allowed"
                                placeholder="GitHub integration coming soon..."
                            />
                        )}

                        {sourceType === "zip" && (
                            <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[var(--border-default)] bg-[var(--bg-root)] p-8 text-center hover:bg-[var(--bg-hover)] transition-colors">
                                <input 
                                    type="file" 
                                    accept=".zip" 
                                    className="hidden" 
                                    onChange={(e) => setZipFile(e.target.files?.[0] || null)} 
                                />
                                <div className="space-y-2 text-[var(--text-secondary)]">
                                    <UploadCloud size={24} className="mx-auto" />
                                    <p className="text-[13px]">{zipFile ? zipFile.name : "Drag and drop or click to upload Webflow ZIP"}</p>
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Status Message */}
                    {status && (
                        <div className={clsx(
                            "flex items-center gap-2 rounded-md px-3 py-2 text-[13px]",
                            status.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        )}>
                            {status.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {status.message}
                        </div>
                    )}

                    {/* Submit Action */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading || sourceType === "github" || (sourceType === "clipboard" && !content) || (sourceType === "zip" && !zipFile)}
                            className="w-full rounded-md bg-[var(--accent-primary)] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_0_15px_var(--accent-glow)] hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            {loading ? "Processing..." : "Start Ingestion"}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
