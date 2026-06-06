"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileArchive, ArrowRight } from "lucide-react";
import { projectService, type Project } from "@/services/project.service";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface WebflowIngestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WebflowIngestModal({ isOpen, onClose }: WebflowIngestModalProps) {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [zipFile, setZipFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            projectService.getProjects().then(setProjects).catch(console.error);
        }
    }, [isOpen]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith(".zip")) {
            setZipFile(file);
            setStatus(null);
        } else {
            setStatus({ type: "error", message: "Please drop a valid .zip file" });
        }
    };

    const handleSubmit = async () => {
        if (!zipFile) {
            setStatus({ type: "error", message: "Please select a Webflow ZIP file" });
            return;
        }

        let projectId = selectedProjectId;

        // If no project selected, auto-create one from the zip filename
        if (!projectId) {
            try {
                const name = zipFile.name.replace(".zip", "").replace(/-|_/g, " ");
                const newProject = await projectService.createProject({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    platform: "webflow",
                    framework: "React",
                });
                projectId = newProject.id;
            } catch (err: any) {
                setStatus({ type: "error", message: "Failed to create project: " + err.message });
                return;
            }
        }

        setLoading(true);
        setStatus(null);

        try {
            const formData = new FormData();
            formData.append("file", zipFile);

            const analyzerUrl = process.env.NEXT_PUBLIC_ANALYZER_URL || "http://localhost:8000";
            const res = await fetch(
                `${analyzerUrl}/analyzer/ingest/webflow?project_id=${projectId}`,
                { method: "POST", body: formData }
            );

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Failed to parse zip" }));
                throw new Error(err.detail || "Failed to parse Webflow export");
            }

            const data = await res.json();

            if (data.analysis_id) {
                sessionStorage.setItem(`analysis_id_${projectId}`, data.analysis_id);
            }
            if (data.blueprint) {
                localStorage.setItem(`blueprint_${projectId}`, JSON.stringify(data.blueprint));
            }

            setStatus({ type: "success", message: "Webflow project parsed! Taking you to the blueprint..." });
            setTimeout(() => {
                onClose();
                router.push(`/projects/${projectId}/blueprint`);
            }, 900);

        } catch (err: any) {
            setStatus({
                type: "error",
                message: err.message || "Failed to process Webflow export",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#141414] border border-[#2C2C2C] text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileArchive size={20} className="text-blue-400" />
                        Webflow Export Import
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Project selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-[#666] uppercase tracking-wider">
                            Target Project <span className="text-[#444] normal-case">(optional — we'll create one if blank)</span>
                        </label>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                        >
                            <option value="">Create new project from ZIP name</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={clsx(
                            "relative rounded-xl border-2 border-dashed transition-all cursor-pointer",
                            isDragging
                                ? "border-blue-500 bg-blue-500/5"
                                : zipFile
                                    ? "border-emerald-500/50 bg-emerald-500/5"
                                    : "border-[#333] bg-[#1C1C1C] hover:border-[#444] hover:bg-[#222]"
                        )}
                    >
                        <label className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer">
                            <input
                                type="file"
                                accept=".zip"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] || null;
                                    setZipFile(f);
                                    setStatus(null);
                                }}
                            />
                            {zipFile ? (
                                <>
                                    <CheckCircle2 size={28} className="text-emerald-400" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-emerald-400">{zipFile.name}</p>
                                        <p className="text-xs text-[#666] mt-1">{(zipFile.size / 1024).toFixed(0)} KB — click to change</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={28} className="text-[#555]" />
                                    <div className="text-center">
                                        <p className="text-sm text-[#888]">Drop your Webflow ZIP here</p>
                                        <p className="text-xs text-[#555] mt-1">or click to browse</p>
                                    </div>
                                </>
                            )}
                        </label>
                    </div>

                    {/* How it works */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                            { step: "1", label: "Upload ZIP" },
                            { step: "2", label: "AI Parses HTML/CSS" },
                            { step: "3", label: "React Blueprint" },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1a1a1a] border border-[#252525]">
                                <span className="text-[10px] font-bold text-blue-400 font-mono">{item.step}</span>
                                <span className="text-[10px] text-[#666] leading-tight">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Status */}
                    {status && (
                        <div className={clsx(
                            "flex items-center gap-2 p-3 rounded-lg border text-xs",
                            status.type === "success"
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                                : "bg-red-500/5 border-red-500/20 text-red-400"
                        )}>
                            {status.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {status.message}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!zipFile || loading}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-40 shadow-lg shadow-blue-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Parsing...
                                </>
                            ) : (
                                <>
                                    Parse & Import
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
