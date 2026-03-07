"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { projectService, type Project } from "@/services/project.service";
import { UploadCloud, Github, Clipboard, FileCode, CheckCircle, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function IngestPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [sourceType, setSourceType] = useState<"clipboard" | "github" | "zip">("clipboard");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        projectService.getProjects().then(setProjects).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) {
            setStatus({ type: "error", message: "Please select a project" });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            await projectService.ingestCode({
                projectName: selectedProject, // Note: Backend expects name, but we might need ID in future. Using name for now as per interface.
                sourceType,
                content: sourceType === "clipboard" ? content : undefined,
                // Add other fields for github/zip later
            });
            setStatus({ type: "success", message: "Ingestion job queued successfully" });
            setContent("");
        } catch (err) {
            setStatus({ type: "error", message: "Failed to queue ingestion job" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-medium text-[var(--text-primary)]">Ingest Code</h1>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                        Import code from various sources into your project.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Project Selection */}
                    <div className="space-y-2">
                        <label className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Target Project</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-panel)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all appearance-none"
                        >
                            <option value="">Select a project...</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.name}>
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
                                { id: "clipboard", label: "Clipboard", icon: Clipboard },
                                { id: "github", label: "GitHub", icon: Github },
                                { id: "zip", label: "Upload ZIP", icon: FileCode },
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
                            <div className="flex items-center justify-center rounded-md border border-dashed border-[var(--border-default)] bg-[var(--bg-root)] p-8 text-center">
                                <div className="space-y-2 text-[var(--text-secondary)]">
                                    <UploadCloud size={24} className="mx-auto" />
                                    <p className="text-[13px]">Drag and drop or click to upload</p>
                                    <p className="text-[11px] text-[var(--text-tertiary)]">(Coming soon)</p>
                                </div>
                            </div>
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
                            disabled={loading || sourceType !== "clipboard"}
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
