"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { CheckCircle2, FileCode, Layers, GitBranch, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { analysisService } from "@/services/analysis.service";
import clsx from "clsx";

interface UPGNode {
    id: string;
    type: string;
    name?: string;
    tag?: string;
    content?: string;
    children?: string[];
}

interface BlueprintData {
    rootComponentId: string;
    nodes: Record<string, UPGNode>;
    project?: { name?: string; description?: string };
}

export default function BlueprintReviewPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingBlueprint, setLoadingBlueprint] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Load blueprint — prefer Supabase, fall back to localStorage
    useEffect(() => {
        const load = async () => {
            setLoadingBlueprint(true);
            setLoadError(null);

            // 1. Try Supabase via analysis service
            try {
                const analyses = await analysisService.getAnalyses(projectId);
                const webflowAnalysis = analyses.find((a: any) => a.source === "webflow_blueprint");
                if (webflowAnalysis?.result_json?.blueprint) {
                    setBlueprint(webflowAnalysis.result_json.blueprint);
                    setAnalysisId(webflowAnalysis.id);
                    setLoadingBlueprint(false);
                    return;
                }
            } catch (err) {
                console.warn("[Blueprint] Supabase load failed, trying fallback:", err);
            }

            // 2. Try sessionStorage analysis_id hint
            const storedAnalysisId = sessionStorage.getItem(`analysis_id_${projectId}`);
            if (storedAnalysisId) setAnalysisId(storedAnalysisId);

            // 3. Try localStorage fallback (set by ingest page on Supabase failure)
            const localData = localStorage.getItem(`blueprint_${projectId}`);
            if (localData) {
                try {
                    setBlueprint(JSON.parse(localData));
                    setLoadingBlueprint(false);
                    return;
                } catch { /* ignore parse errors */ }
            }

            setLoadError("No blueprint found. Please go back and upload a Webflow ZIP.");
            setLoadingBlueprint(false);
        };

        if (projectId) load();
    }, [projectId]);

    const handleApprove = () => {
        setGenerating(true);
        router.push(`/projects/${projectId}/generating?analysis_id=${analysisId ?? ""}`);
    };

    const renderNodeTree = (nodeId: string, depth = 0): React.ReactNode => {
        if (!blueprint) return null;
        const node = blueprint.nodes[nodeId];
        if (!node) return null;

        const isComponent = node.type === "component";
        const isText = node.type === "text";

        if (isText) {
            const text = node.content?.trim();
            if (!text) return null;
            return (
                <div
                    key={node.id}
                    className="font-mono text-[11px] text-[var(--text-tertiary)] truncate"
                    style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                >
                    &quot;{text.substring(0, 60)}&quot;
                </div>
            );
        }

        return (
            <div key={node.id} className="font-mono text-[13px]">
                <div
                    className={clsx(
                        "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors cursor-default",
                        isComponent && "text-[var(--accent-primary)] font-semibold",
                        !isComponent && "text-[var(--text-secondary)]"
                    )}
                    style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                >
                    {isComponent ? <Layers size={14} /> : <FileCode size={14} />}
                    <span>
                        {isComponent ? node.name : node.tag ? `<${node.tag}>` : "element"}
                    </span>
                </div>
                {node.children && node.children.slice(0, 12).map((childId) => renderNodeTree(childId, depth + 1))}
            </div>
        );
    };

    const componentCount = blueprint
        ? Object.values(blueprint.nodes).filter((n) => n.type === "component" && n.name !== "App").length
        : 0;

    const nodeCount = blueprint ? Object.keys(blueprint.nodes).length : 0;

    if (loadingBlueprint) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)]">
                        <Loader2 size={28} className="animate-spin text-[var(--accent-primary)]" />
                        <p className="text-[13px]">Loading blueprint...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-medium text-[var(--text-primary)] flex items-center gap-2">
                            <GitBranch size={24} className="text-[var(--accent-primary)]" />
                            Blueprint Review
                        </h1>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                            Review the AI&apos;s proposed React component structure before generating code.
                        </p>
                    </div>
                    <button
                        onClick={handleApprove}
                        disabled={generating || !blueprint}
                        className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_0_15px_var(--accent-glow)] hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                Approve &amp; Generate <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>

                {loadError ? (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-12 text-center">
                        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-400" />
                        <p className="text-[var(--text-secondary)] text-[13px]">{loadError}</p>
                        <button
                            onClick={() => router.push("/ingest")}
                            className="mt-4 px-4 py-2 rounded-md bg-[var(--accent-primary)] text-white text-[13px] hover:opacity-90 transition-opacity"
                        >
                            ← Back to Import
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-6">
                        {/* Component Tree */}
                        <div className="col-span-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-sm overflow-hidden flex flex-col">
                            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3 flex items-center gap-2">
                                <FileCode size={16} className="text-[var(--text-secondary)]" />
                                <span className="text-[13px] font-medium text-[var(--text-primary)]">Proposed Component Tree</span>
                                <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">{componentCount} components</span>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[600px] bg-[var(--bg-root)]">
                                {blueprint?.rootComponentId && renderNodeTree(blueprint.rootComponentId)}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-5">
                                <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">Summary</h3>
                                <div className="space-y-3 text-[13px]">
                                    {blueprint?.project?.name && (
                                        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                                            <span className="text-[var(--text-secondary)]">Project:</span>
                                            <span className="text-[var(--text-primary)] font-medium truncate max-w-[120px]">{blueprint.project.name}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                                        <span className="text-[var(--text-secondary)]">Components:</span>
                                        <span className="text-[var(--text-primary)] font-medium">{componentCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                                        <span className="text-[var(--text-secondary)]">Total Nodes:</span>
                                        <span className="text-[var(--text-primary)] font-medium">{nodeCount}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                                        <span className="text-[var(--text-secondary)]">Framework:</span>
                                        <span className="text-[var(--text-primary)] font-medium">React (Next.js)</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-[var(--text-secondary)]">CSS:</span>
                                        <span className="text-[var(--text-primary)] font-medium">Tailwind CSS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {blueprint?.project?.description && (
                                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-5">
                                    <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-2">Detected</h3>
                                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{blueprint.project.description}</p>
                                </div>
                            )}

                            {/* Next Steps */}
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-5">
                                <h3 className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)] mb-3">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    Next Steps
                                </h3>
                                <ul className="space-y-2 text-[13px] text-[var(--text-secondary)]">
                                    <li>1. Review the component tree to ensure major sections are captured.</li>
                                    <li>2. Click &quot;Approve &amp; Generate&quot; to trigger AI code generation.</li>
                                    <li>3. Watch your components generate in real-time.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
